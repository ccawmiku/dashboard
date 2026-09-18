import dgram from 'node:dgram';
export function writeTimestamp(buffer: Buffer, offset: number, epoch: number) {
  buffer.writeUInt32BE(Math.floor(epoch / 1000) + 2208988800, offset);
  buffer.writeUInt32BE(
    Math.round(((epoch % 1000) / 1000) * 2 ** 32),
    offset + 4,
  );
}
export async function fakeNtp(
  options: {
    offsetMs?: number;
    invalid?: boolean;
    silent?: boolean;
    stratum?: number;
    alarm?: boolean;
  } = {},
) {
  const socket = dgram.createSocket('udp4');
  let requests = 0;
  socket.on('message', (packet, peer) => {
    requests++;
    if (options.silent) return;
    const reply = Buffer.alloc(48);
    reply[0] = options.alarm ? 0xe4 : 0x24;
    reply[1] = options.stratum ?? 2;
    packet.copy(reply, 24, 40, 48);
    if (options.invalid) reply[24] ^= 0xff;
    const now = Date.now() + (options.offsetMs ?? 0);
    writeTimestamp(reply, 32, now);
    writeTimestamp(reply, 40, now);
    socket.send(reply, peer.port, peer.address);
  });
  await new Promise<void>((resolve) => socket.bind(0, '127.0.0.1', resolve));
  const address = socket.address();
  return {
    port: address.port,
    requests: () => requests,
    close: () => new Promise<void>((resolve) => socket.close(() => resolve())),
  };
}
