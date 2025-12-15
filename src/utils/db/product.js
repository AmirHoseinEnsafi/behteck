const mongoose = require("mongoose");
const { Schema } = mongoose;

const productSchema = new Schema({
  status: { type: Boolean, required: true },
  name: { type: String, required: true },
  description: { type: String }, 
  subCategory : { type: Schema.Types.ObjectId, ref: 'Subcategory' },
  price: { type: Number, required: true },
  warrantyStartDate: { type: Date, required: true },
  warrantyEndDate: { type: Date, required: true },
  amp: { type: Number, required: true },
  productCode: { type: String, required: true, unique: true },
}, 
{ timestamps: true }
);

productSchema.index({ price: 1 });
productSchema.index({ amp: 1 });
productSchema.index({ warrantyStartDate: 1 });
productSchema.index({ warrantyEndDate: 1 });

const Product = mongoose.model("Product", productSchema);

module.exports = Product ;