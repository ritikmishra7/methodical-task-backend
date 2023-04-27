const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CounterSchema = new Schema({
	_id: { type: Schema.Types.ObjectId, ref: "tasks" },
	count: { type: Number, default: 0 }
});

module.exports = mongoose.model('counter', CounterSchema);
