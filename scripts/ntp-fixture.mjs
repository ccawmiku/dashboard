import dgram from 'node:dgram';
import { Buffer } from 'node:buffer';
import console from 'node:console';
const server = dgram.createSocket('udp4');
function stamp(buffer, offset, epoch) {
  buffer.writeUInt32BE(Math.floor(epoch / 1000) + 2208988800, offset);
  buffer.writeUInt32BE(
    Math.round(((epoch % 1000) / 1000) * 2 ** 32),
    offset + 4,
  );
}
server.on('message', (packet, peer) => {
  if (packet.length !== 48) return;
  const reply = Buffer.alloc(48);
  reply[0] = 0x24;
  reply[1] = 2;
  packet.copy(reply, 24, 40, 48);
  const now = Date.now();
  stamp(reply, 32, now);
  stamp(reply, 40, now);
  server.send(reply, peer.port, peer.address);
});
server.bind(123, '0.0.0.0', () => console.log('NTP fixture listening'));
