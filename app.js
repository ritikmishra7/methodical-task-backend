require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require('cookie-parser');
const { responseMiddleware } = require("@middlewares/response.middleware");
const { errorHandler } = require("@middlewares/error.middleware");
const { authenticateRequest } = require("@middlewares/authentication.middleware");
const { createSocket } = require("@configs/socket");

const initApp = async (connectDB) =>
{
	try
	{
		await connectDB();

		const app = express();
		const httpServer = createServer(app);
		createSocket(httpServer);

		app.use(helmet());
		app.use(cookieParser());

		//For CORS
		let origin = 'http://localhost:3000';
		if (process.env.NODE_ENV === 'production')
		{
			origin = process.env.CORS_ORIGIN;
		}

		app.use(cors({
			origin,
			credentials: true
		}));

		app.use((req, res, next) =>
		{
			res.setHeader("Access-Control-Allow-Methods", "*");
			res.setHeader("Access-Control-Allow-Headers", "*");
			next();
		});

		app.use(morgan('short'));

		app.use(responseMiddleware);
		app.use(express.json({ limit: '25mb' }));
		app.use(express.urlencoded({ extended: false }));

		app.get("/", (req, res) =>
		{
			return res.send("Server is up and running");
		});
		app.use(`/api/auth`, require("@routes/auth.routes"));
		app.use(authenticateRequest);
		app.use(`/api/projects`, require("@routes/project.routes"));
		app.use(`/api/misc`, require("@routes/misc.routes"));
		app.use(`/api/user`, require("@routes/user.routes"));

		app.use(errorHandler);

		const port = process.env.PORT || 5000;

		await httpServer.listen(port);

		console.log(`server started at -> http://localhost:${port}`);

		return app;
	}
	catch (err)
	{
		console.log(err);
		console.log("ERROR STARTING SERVER");
	}
};

module.exports =
{
	initApp
};


