import fs from 'fs';


fs.readdir('./png', function (err, files) {
  const enemies = {};

  if (err) {
    console.error("Could not list the directory.", err);
    process.exit(1);
  }

  files.forEach(function (file) {
    // Make one pass and make the file complete
    const name = file.split('.')[0];
    const image = fs.readFileSync(`./png/${file}`, 'base64');
    // console.log(name, image);
    enemies[name] = image;
  });

  console.log(JSON.stringify(enemies, null, 2));
});

