const mongoose = require("mongoose");
const { Schema } = mongoose;

function pickRandomLetters(sentence)
{
	const letters = sentence.replace(/\s+/g, '');
	let result = '';
	for (let i = 0; i < 2; i++)
	{
		const randomIndex = Math.floor(Math.random() * letters.length);
		result += letters.charAt(randomIndex);
	}
	return result;
}

const projectSchema = Schema(
	{
		name: {
			type: String,
			trim: true,
			set: function (value)
			{
				if (this.isNew)
				{
					let key = value[0].toUpperCase() + pickRandomLetters(value.substr(1)).toUpperCase();
					this.key = key;
				}

				return value;
			}
		},
		description: {
			type: String,
			trim: true
		},
		type: {
			type: String,
			enum: ["PERSONAL", "SHARED"],
			default: "SHARED"
		},
		chat_enabled: {
			type: Boolean,
			default: false,
		},
		document: {
			type: Boolean,
			default: false,
		},
		thumbnail: {
			type: String,
			default: "https://source.unsplash.com/random/900%C3%97700/?tech",
		},
		members: [
			{
				user: {
					type: Schema.Types.ObjectId,
					ref: 'users'
				},
				role: {
					type: String,
					enum: ["ADMIN", "OWNER", "READ", "WRITE"],
					default: "READ"
				},
				status: {
					type: String,
					enum: ["PENDING", "REMOVED", "REJECTED", "JOINED"],
					default: "PENDING"
				}
			}
		],
		key: {
			type: String,
			required: true,
		},
		status: {
			type: String,
			enum: ["ACTIVE", "DELETED"],
			default: "ACTIVE"
		}
	},
	{
		timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
	}
);

module.exports = mongoose.model("projects", projectSchema);
