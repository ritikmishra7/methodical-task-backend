exports.errorHandler = (err, req, res, next) =>
{
	let statusCode = 500;

	//only for jwt errors
	if (err.message === 'jwt expired')
	{
		statusCode = 401;
	}

	res.status(statusCode);
	res.json(
		{
			message: err.message,
			error: {
				stack: process.env.NODE_ENV === "production" ? null : err.stack
			}
		});
};
