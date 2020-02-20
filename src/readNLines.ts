import fs from "fs";

/*
 * Based on Pensierinmusica's Firstline package
 */

export default async function(path : string, count : number, usrOpts?: any) : Promise<string> {
  const opts = {
    encoding: 'utf8',
    lineEnding: '\n'
  };
  Object.assign(opts, usrOpts);
  return new Promise((resolve, reject) => {
    const rs = fs.createReadStream(path, { encoding: opts.encoding });
    let instance_count = 0; 
    let acc = '';
    let pos = 0;
    let index;
    rs
      .on('data', chunk => {
        index = chunk.indexOf(opts.lineEnding);
        acc += chunk;
        if (index === -1) {
          pos += chunk.length;
        } else {
          if (pos > 0) {
            pos += (pos - index);
          } else {
            pos += index;
          }
          if (instance_count == count) {
            rs.close();
          } else {
            instance_count += 1;
          }
        }
      })
      .on('close', () => resolve(acc.slice(acc.charCodeAt(0) === 0xFEFF ? 1 : 0, pos)))
      .on('error', err => reject(err));
  });
}