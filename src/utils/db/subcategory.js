const mongoose = require('mongoose');
const { Schema } = mongoose;

const subcategorySchema = new Schema({
  name: { type: String, required: true, unique: true },
  category : { type: Schema.Types.ObjectId, ref: 'Category' }, 
}, 
{ timestamps: true }
);

const Subcategory = mongoose.model('Subcategory', subcategorySchema);

module.exports = Subcategory;
