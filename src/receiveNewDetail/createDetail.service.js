const mongoose = require('mongoose');
const category = require('../utils/db/category');
const product = require('../utils/db/product');
const subcategory = require('../utils/db/subcategory');
const logger = require('../utils/logger/winston');


class CreateProductService {
    constructor (productModel, subcategoryModel , category ) {
        this.category = category ;
        this.productModel = productModel;
        this.subcategoryModel = subcategoryModel;
        this.savingInternalError = [];
        this.alreadyExist = [];
    }

    checkSubCategory = async (name) => {
        return this.subcategoryModel.findOne({ name }).lean();
    }

    checkCategory = async (name) => {
        return this.category.findOne({ name }).lean();
    }

    checkProductId = async (productCode) => {
        return this.productModel.findOne({ productCode }).lean();
    }

    createProduct = async (detail , session) => {
        return this.productModel.create( [ detail ], { session });
    }

    createCategory = async (detail , session) => {
        return this.category.create( [ detail ], { session });
    }

    createSubCategory = async (detail , session) => {
        return this.subcategoryModel.create( [ detail ], { session });
    }

    updateSubCategory = async (subcategoryId , productId , session) => {
        await this.subcategoryModel.updateOne(
                { _id: subcategoryId },
                { $push: { products: productId } },
                { session }
            );
    }

    updateCategory = async (categoryId , subcategoryId , session) => {
        const categoryDetail = await this.category.findOne(
            { _id: categoryId },
            null,
            { session }
        );

        if (!Array.isArray(categoryDetail.subCategory)) {
            categoryDetail.subCategory = [];
        }

        categoryDetail.subCategory.push(subcategoryId);

        await categoryDetail.save({ session });
    }

    processParsedData = async (parsedData) => {
        for (const data of parsedData) {

            logger.info(`start to process the incoming chunk of json with detail : ${JSON.stringify(data)}`)
            
            const existingProduct = await this.checkProductId(data.productCode);

            logger.info(`check the exist productCode in data base with this result ${JSON.stringify(existingProduct)} process Detail : ${JSON.stringify(data)}`)

            if (existingProduct) {
                this.alreadyExist.push(existingProduct);
                continue;
            };

            const existCategory = await this.checkCategory(data.category);
            logger.info(`check the category exist in data base with this result ${JSON.stringify(existCategory)} process Detail : ${JSON.stringify(data)}`)

            const existSubCategory = await this.checkSubCategory(data.subcategory);
            logger.info(`check the subCategory exist in the data base with this result ${JSON.stringify(existSubCategory)} process Detail : ${JSON.stringify(data)}`)

            const session = await mongoose.startSession();
            try {
                await session.withTransaction(async () => {
                    logger.info(`start transaction to saving data process Detail : ${JSON.stringify(data)}`)
                    let {category , subcategory , ...detail} = data
                    let baseCategory = existCategory;

                    if(!existCategory) {
                        const result = await this
                            .createCategory({name : category} , session);

                        baseCategory = result[0];
                    }


                    let baseSubCategory = existSubCategory
                    
                    if(!existSubCategory) {
                        const result = await this
                            .createSubCategory({name : subcategory , category : baseCategory._id} , session);

                        baseSubCategory = result[0];
                    }
                    
                    detail.subCategory = baseSubCategory._id ;
                    await this.createProduct(detail , session);
                });
                logger.info(`done the transaction for this process Detail : ${JSON.stringify(data)}`)
            } catch (error) {
                this.savingInternalError.push(data);
                logger.error(`error catch for the process Detail : ${JSON.stringify(data)}`);
            } finally {
                await session.endSession();
            }
        }

        if(this.savingInternalError.length > 0) return {
            message : "تعدادی از دیتا های ورودی با مشکل سیو در دیتابیس روبه رو شده اند" , 
            errorData : this.savingInternalError , 
            alreadyExist : this.alreadyExist
        }

        return {
            message : 'اطلاعات ورودی با موفقیت ثبت شده اند' ,
            alreadyExist : this.alreadyExist
        };
    }
}

const productService = new CreateProductService(product , subcategory , category);

module.exports = productService;