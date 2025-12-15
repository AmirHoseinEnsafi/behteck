const Product = require('../utils/db/product');
const mongoose = require('mongoose');


class QueryService {
    constructor(productModel){
        this.productModel = productModel;
    }

    pipelines = (filters) => {
        const pipeline = [];

        if (filters.status !== undefined) {
            pipeline.push({ $match: { status: filters.status } });
        }

        if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {

            const priceMatch = {};

            if (filters.minPrice !== undefined) priceMatch.$gte = filters.minPrice;

            if (filters.maxPrice !== undefined) priceMatch.$lte = filters.maxPrice;

            pipeline.push({ $match: { price: priceMatch } });
        }

        if (filters.warrantyActive === true) {

            const now = new Date();

            pipeline.push({$match: {  warrantyStartDate: { $lte: now }, warrantyEndDate: { $gte: now } } });

        }

        if (filters.warrantyActive === false) {

            const now = new Date();

            pipeline.push({
                $match: {
                $or: [
                    { warrantyStartDate: { $gt: now } },
                    { warrantyEndDate: { $lt: now } }, 
                ]
                }
            });
        }

        if (filters.minAmper !== undefined || filters.maxAmper !== undefined) {

            const amp = {};

            if (filters.minAmper !== undefined) amp.$gte = filters.minAmper;

            if (filters.maxAmper !== undefined) amp.$lte = filters.maxAmper;

            pipeline.push({ $match: { amp } });
        }


        if (filters.warrantyStartDate && (filters.warrantyStartDate.from !== undefined || filters.warrantyStartDate.to !== undefined)){
            const {from , to} = filters.warrantyStartDate;
            const warrantyStartDate = {};

            if(from) warrantyStartDate.$gte = from ;

            if(to) warrantyStartDate.$lte = to;

            pipeline.push({ $match: { warrantyStartDate } });
        }

        if(filters.warrantyEndDate && (filters.warrantyEndDate.from !== undefined || filters.warrantyEndDate.to !== undefined)) {
            const {from , to} = filters.warrantyEndDate;
            const warrantyEndDate = {};

            if(from) warrantyEndDate.$gte = from ;

            if(to) warrantyEndDate.$lte = to;

            pipeline.push({ $match: { warrantyEndDate } });
        }

        pipeline.push({
            $lookup: {
                from: "subcategories",
                localField: "subCategory",
                foreignField: "_id",
                as: "subCategory"
            }
        });

        pipeline.push({
            $lookup: {
                from: "categories",
                localField: "subCategory.category",
                foreignField: "_id",
                as: "category"
            }
        });

        pipeline.push({
            $project: {
                name: 1,
                price: 1,
                amp: 1,
                productCode: 1,
                status: 1,
                createdAt : 1 ,
                updatedAt : 1,
                warrantyStartDate : 1 ,
                warrantyEndDate : 1 ,
                subCategory: { $arrayElemAt: ["$subCategory", 0] },
                category: { $arrayElemAt: ["$category", 0] }
            }
        });

        if (filters.categoryIds?.length) {
            filters.categoryIds = filters.categoryIds.map(id => new mongoose.Types.ObjectId(id));
            pipeline.push({
                $match: { "category._id": { $in: filters.categoryIds } }
            });
        }

        if (filters.subcategoryIds?.length) {
            filters.subcategoryIds = filters.subcategoryIds.map(id => new mongoose.Types.ObjectId(id));
            pipeline.push({
                $match: {
                    "subCategory._id": { $in: filters.subcategoryIds }
                }
            });
        }

        if (filters.search && filters.search.trim()) {
            const regex = new RegExp(filters.search.trim(), "i");

            pipeline.push({
                $match: {
                    $or: [
                        { name: regex },
                        { productCode: regex },
                        { "subCategory.name": regex },
                        { "category.name": regex }
                    ]
                }
            });
        }
        
        const allowedSortFields = [
            "amp",
            "price",
            "createdAt",
            "warrantyStartDate",
            "warrantyEndDate" ,
        ];
        
        let sort = {};

        if (filters.sortField && allowedSortFields.includes(filters.sortField)) {

            const order = filters.sortOrder ? filters.sortOrder === "desc" ? -1 : 1 : 1 ;

            sort[filters.sortField] = order;

        } else {
            sort["createdAt"] = -1; 
        }

        pipeline.push({
            $sort: sort
        });

        const page = Number(filters.page) || 1;
        const rowsPerPage = Number(filters.rowsPerPage) || 10;
        const skip = (page - 1) * rowsPerPage;

        pipeline.push({
            $facet: {

                data: [
                    { $skip: skip },
                    { $limit: rowsPerPage }
                ],

                total: [
                    { $count: "count" }
                ]
            }
        });

        pipeline.push({
            $project: {
                data: 1,

                totalCount: {
                    $ifNull: [{ $arrayElemAt: ["$total.count", 0] }, 0]
                },

                pageCount: {
                    $size: "$data"
                }
            }
        });

        return pipeline ;
    }

    queryData = async (filters) => {
        const pipelines = this.pipelines(filters);

        return this.productModel.aggregate(pipelines);
    }
}

const queryService = new QueryService(Product);

module.exports = queryService;