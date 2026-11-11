import { connect as connectNet, type Socket } from "node:net";
import { connect as connectTls, type TLSSocket } from "node:tls";

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

function smtpConfiguration() {
  const username = process.env.SMTP_USERNAME?.trim();
  const password = process.env.SMTP_APP_PASSWORD?.replace(/\s/g, "");
  if (!username || !password) return null;
  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || "587");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid TCP port.");
  }
  return { host, port, username, password };
}

class SmtpSession {
  private iterator: AsyncIterator<Buffer | string>;
  private buffer = "";

  constructor(private socket: Socket | TLSSocket) {
    this.iterator = socket[Symbol.asyncIterator]();
  }

  async response(): Promise<{ code: number; text: string }> {
    let finalLine = "";
    while (true) {
      let newline = this.buffer.indexOf("\n");
      while (newline < 0) {
        const { value, done } = await this.iterator.next();
        if (done) throw new Error("SMTP connection closed unexpectedly.");
        this.buffer +=
          typeof value === "string" ? value : value.toString("utf8");
        newline = this.buffer.indexOf("\n");
      }
      const line = this.buffer.slice(0, newline).replace(/\r$/, "");
      this.buffer = this.buffer.slice(newline + 1);
      if (!/^\d{3}[ -]/.test(line)) {
        throw new Error("Invalid response from SMTP server.");
      }
      finalLine = line;
      if (line[3] === " ") {
        const code = Number(line.slice(0, 3));
        if (code < 200 || code >= 400) {
          throw new Error(`SMTP server rejected a command (${code}).`);
        }
        return { code, text: finalLine };
      }
    }
  }

  async command(command: string): Promise<{ code: number; text: string }> {
    await new Promise<void>((resolve, reject) => {
      this.socket.write(`${command}\r\n`, (error) =>
        error ? reject(error) : resolve(),
      );
    });
    return this.response();
  }

  async writeData(data: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.socket.write(data, (error) =>
        error ? reject(error) : resolve(),
      );
    });
  }

  async upgradeToTls(host: string): Promise<void> {
    const rawSocket = this.socket as Socket;
    const secureSocket = connectTls({
      socket: rawSocket,
      servername: host,
      rejectUnauthorized: true,
    });
    await new Promise<void>((resolve, reject) => {
      secureSocket.once("secureConnect", resolve);
      secureSocket.once("error", reject);
    });
    this.socket = secureSocket;
    this.iterator = secureSocket[Symbol.asyncIterator]();
  }

  close(): void {
    this.socket.destroy();
  }
}

async function openSession(host: string, port: number): Promise<SmtpSession> {
  const socket = connectNet({ host, port });
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("error", reject);
    socket.setTimeout(15_000, () => reject(new Error("SMTP connection timed out.")));
  });
  const session = new SmtpSession(socket);
  const greeting = await session.response();
  if (greeting.code !== 220) throw new Error("SMTP server is unavailable.");
  return session;
}

function safeHeader(value: string): string {
  return value.replace(/[\r\n]/g, " ");
}

export async function sendStockWiseEmail(
  message: MailMessage,
): Promise<boolean> {
  const configuration = smtpConfiguration();
  if (!configuration) return false;

  const { host, port, username, password } = configuration;
  const session = await openSession(host, port);
  try {
    await session.command(`EHLO ${host}`);
    const startTls = await session.command("STARTTLS");
    if (startTls.code !== 220) throw new Error("SMTP STARTTLS is unavailable.");
    await session.upgradeToTls(host);
    await session.command(`EHLO ${host}`);
    await session.command("AUTH LOGIN");
    await session.command(Buffer.from(username).toString("base64"));
    await session.command(Buffer.from(password).toString("base64"));
    await session.command(`MAIL FROM:<${username}>`);
    await session.command(`RCPT TO:<${message.to}>`);
    const dataResponse = await session.command("DATA");
    if (dataResponse.code !== 354) throw new Error("SMTP DATA was rejected.");

    const body = [
      `From: ${safeHeader(username)}`,
      `To: ${safeHeader(message.to)}`,
      `Subject: ${safeHeader(message.subject)}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      message.text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
        .split("\n")
        .map((line) => (line.startsWith(".") ? `.${line}` : line))
        .join("\r\n"),
      ".",
    ].join("\r\n");
    await session.writeData(`${body}\r\n`);
    const sent = await session.response();
    if (sent.code !== 250) throw new Error("SMTP server did not accept the email.");
    await session.command("QUIT");
    return true;
  } finally {
    session.close();
  }
}

export function registrationEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_USERNAME?.trim() &&
      process.env.SMTP_APP_PASSWORD?.trim(),
  );
}
