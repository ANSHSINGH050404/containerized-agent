import Docker from 'dockerode';
const docker = new Docker({ socketPath: '//./pipe/docker_engine' });
const dockerEscaped = new Docker({ socketPath: '\\\\.\\pipe\\docker_engine' });
async function test() {
  try { await docker.ping(); console.log('Pipe 1 works'); } catch (e) { console.log('Pipe 1 fails:', e.message); }
  try { await dockerEscaped.ping(); console.log('Pipe 2 works'); } catch (e) { console.log('Pipe 2 fails:', e.message); }
}
test();
