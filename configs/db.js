const mongoose = require("mongoose");

const connectMongoDB = async () =>
{
	try
	{
		const mongoURI = process.env.MONGO_DB_URI;

		const conn = await mongoose.connect(mongoURI);
		console.log(`Mongo connection successful: ${conn.connection.host}`);
	}
	catch (error)
	{
		console.log(error);
		process.exit(1);
	}
};

module.exports = connectMongoDB;
