const Joi = require('joi');
const dayjs = require('dayjs');
const jalaali = require('jalaali-js');
const mongoose = require('mongoose');


class ExcelParserMiddleware {
    objectId = Joi.string().custom((value, helpers) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
            return helpers.error('any.invalid');
        }
        return value;
    });

    objectIdArray = Joi.alternatives().try(

        Joi.array().items(this.objectId).min(1),

        Joi.string().custom((value, helpers) => {
            const arr = value.split(',');
            if (arr.some(id => !mongoose.Types.ObjectId.isValid(id))) {
                return helpers.error('any.invalid');
            }
            return arr;
        })
    );

    dateValidator = (value, helpers) => {
        if (typeof value !== 'string') {
            return helpers.error('any.invalid');
        }

        const [year] = value.split('/').map(Number);

        if (year >= 1400 && year <= 1410) {
            const converted = this.shamsiToStandard(value);
            if (!converted) return helpers.error('any.invalid');
            return converted;
        }

        const date = dayjs(value, ['YYYY-MM-DD', 'YYYY/MM/DD'], true);
        if (!date.isValid()) return helpers.error('any.invalid');

        return date.toDate();
    };

    shamsiToStandard = (jDateString) => {
        const [jy, jm, jd] = jDateString.split('/').map(Number);

        const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);

        return new Date(gy, gm - 1, gd); 
    }

    validate = async (req , res , next) => {
        const querySchema = Joi.object({

            status: Joi.boolean().optional(),

            minPrice: Joi.number().min(0).optional(),
            maxPrice: Joi.number().min(0).optional(), 

            warrantyActive: Joi.boolean().optional(),

            minAmper: Joi.number().min(0).max(300).optional(),
            maxAmper: Joi.number().min(0).max(300).optional(),

            categoryIds: this.objectIdArray.optional(),
            subcategoryIds: this.objectIdArray.optional(),

            'warrantyStartDate.from': Joi.string().custom(this.dateValidator).optional(),
            'warrantyStartDate.to': Joi.string().custom(this.dateValidator).optional(),

            'warrantyEndDate.from': Joi.string().custom(this.dateValidator).optional(),
            'warrantyEndDate.to': Joi.string().custom(this.dateValidator).optional(),

            sortField: Joi.string().optional(),
            sortOrder: Joi.string().valid('asc', 'desc').optional() ,

            search: Joi.string().optional(),

            page: Joi.number().integer().min(1).default(1),
            rowsPerPage: Joi.number().integer().min(1).max(100).default(10), 
        });

        const { error, value } = querySchema.validate(req.query, { convert: true });

        if (error) {
            return res.status(400).json({ error: error.details });
        }

        if (value['warrantyStartDate.from'] || value['warrantyStartDate.to']) {
            value.warrantyStartDate = {
                from: value['warrantyStartDate.from'],
                to: value['warrantyStartDate.to'],
            };

            delete value['warrantyStartDate.from'];
            delete value['warrantyStartDate.to'];
        }

        if (value['warrantyEndDate.from'] || value['warrantyEndDate.to']) {
            value.warrantyEndDate = {
                from: value['warrantyEndDate.from'],
                to: value['warrantyEndDate.to'],
            };

            delete value['warrantyEndDate.from'];
            delete value['warrantyEndDate.to'];
        }

        req.income = value;
        next();
    }
}

const middleware = new ExcelParserMiddleware();

module.exports = middleware;