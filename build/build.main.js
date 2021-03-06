const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const terser = require('terser');
const rollup = require('rollup');
const configs = require('./configs');

if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

build(Object.keys(configs).map(key => configs[key]));

function build(builds) {
  let built = 0;
  const total = builds.length;
  const next = () => {
    buildEntry(builds[built])
      .then(() => {
        built++;
        if (built < total) {
          next();
        }
      })
      .catch(logError);
  };

  next();
}

function buildEntry({ input, output }) {
  const { file, banner } = output;
  const isProd = /min\.js$/.test(file);
  return rollup
    .rollup(input)
    .then((bundle) =>{
      if (/index\.common\.js$/.test(file)) {
        return bundle.write(output).then(() => {
          return bundle.generate(output);
        })
      }
      return bundle.generate(output)
    })
    .then((arg) => {
      const { output: [{ code, map }] } = arg;
      if (isProd) {
        const minified =
          (banner ? banner + '\n' : '') +
          terser.minify(code, {
            toplevel: true,
            output: {
              ascii_only: true,
            },
            compress: {
              pure_funcs: ['makeMap'],
            },
          }).code;
        return Promise.all([write(file, minified, true), write(file + '.map', JSON.stringify(map))]);
      } else {
        return Promise.all([write(file, code), write(file + '.map', JSON.stringify(map))]);
      }
    });
}

function write(dest, code, zip) {
  return new Promise((resolve, reject) => {
    function report(extra) {
      console.log(blue(path.relative(process.cwd(), dest)) + ' ' + getSize(code) + (extra || ''));
      resolve();
    }

    fs.writeFile(dest, code, err => {
      if (err) return reject(err);
      if (zip) {
        zlib.gzip(code, (err, zipped) => {
          if (err) return reject(err);
          report(' (gzipped: ' + getSize(zipped) + ')');
        });
      } else {
        report();
      }
    });
  });
}

function getSize(code) {
  return (code.length / 1024).toFixed(2) + 'kb';
}

function logError(e) {
  console.log(e);
}

function blue(str) {
  return '\x1b[1m\x1b[34m' + str + '\x1b[39m\x1b[22m';
}
