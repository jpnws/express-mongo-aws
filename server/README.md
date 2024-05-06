# Express MongoDB AWS

## Development

- Execute `npm run dev`: This command will in turn execute the `nodemon` command.

According to the `nodemon.json` configuration, nodemon will run `tsc && npm start` every time any file with the `.ts` extension changes within the `src` folder.

- `tsc` will transpile the TypeScript files into JavaScript and output them into the `dist` folder.
- `npm start` will execute `cross-env NODE_ENV=development node dist/index.js`.

## Semi-Production

Execute `npm run build` to transpile TypeScript files into JavaScript and store the output in the `dist` folder.

Execute `docker build -t express-mongodb-server .` within the project folder where the `Dockerfile` is present; this will create a Docker image.

Execute `docker run -p 3002:3000 express-mongodb-server` to run the Docker container based on the image you just created.

Navigate to `http://localhost:3002` to view the running app.
