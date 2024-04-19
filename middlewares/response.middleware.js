exports.responseMiddleware = function (req, res, next)
{
	res.success = function (
		{
			result = [],
			code = 200,
			message = "Success"
		})
	{
		res.status(code).send(
			{
				result,
				message
			});
	};

	res.error = function (
		{
			error = {},
			code = 400,
			message = "Server encountered a bad request"
		})
	{
		res.status(code).send(
			{
				error,
				message
			});
	};

	next();
};
