const JWT = require("@configs/jwt");

const authenticateRequest = (req, res, next) =>
{
	const result = JWT.validateRequestHeader(req.headers.authorization);

	if (!result)
	{
		return res.error({ message: "Failed to authenticate", code: 401 });
	}

	req.user = result.user;
	next();
};

module.exports =
{
	authenticateRequest
};
