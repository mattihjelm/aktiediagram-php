// Tar bort testdatan efter körningen.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

module.exports = async () => {
  const dir = process.env.AKTIER_E2E_DIR;
  // Ta bara bort en katalog som testerna själva har skapat i den tillfälliga katalogen.
  if (dir && path.basename(dir).startsWith('aktier-e2e-') && fs.existsSync(dir) && fs.realpathSync(dir).startsWith(fs.realpathSync(os.tmpdir()))) {
    fs.rmSync(dir, {recursive: true, force: true});
  }
};
