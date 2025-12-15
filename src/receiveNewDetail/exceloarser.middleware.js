const xlsx = require('node-xlsx');
const jalaali = require('jalaali-js');
const logger = require('../utils/logger/winston');

class ExcelParserMiddleware {

    parsedData = [];

    headerMap = {
        "وضعیت": "status",
        "نام": "name",
        "دسته اصلی": "category",
        "زیردسته": "subcategory",
        "قیمت ": "price",
        "شروع گارانتی": "warrantyStartDate",
        "مدت گارانتی (ماه)": "warrantyMonths",
        "آمپر": "amp",
        "شناسه کالا": "productCode"
    };

    incomingDataOrder = [];

    validateProductObject = (obj) => {
        let incomingData = JSON.parse(JSON.stringify(obj));
        const errors = [];

        if (!incomingData.name || typeof incomingData.name !== 'string' || incomingData.name.length < 3) {
            errors.push("نام: باید رشته باشد و خالی نباشد");
        }

        if (incomingData.status === 'فعال') {
            incomingData.status = true;
        } else if (incomingData.status === 'غیرفعال') {
            incomingData.status = false;
        } else {
            errors.push("وضعیت: باید 'فعال' یا 'غیرفعال' باشد");
        }

        if (isNaN(Number(incomingData.amp))) errors.push("آمپر: باید عدد باشد");

        if (!incomingData.category || typeof incomingData.category !== 'string') errors.push("دسته اصلی: باید رشته باشد");

        if (!incomingData.subcategory || typeof incomingData.subcategory !== 'string') errors.push("زیردسته: باید رشته باشد");

        if (isNaN(Number(incomingData.price)) || Number(incomingData.price) < 0) errors.push("قیمت: باید عدد مثبت باشد");

        try {
            incomingData.warrantyStartDate = this.shamsiToStandard(incomingData.warrantyStartDate);
        } catch {
            errors.push("شروع گارانتی: تاریخ معتبر نیست");
        }
        
        const months = Number(incomingData.warrantyMonths);
        if (isNaN(months) || months < 0) errors.push("مدت گارانتی: باید عدد مثبت باشد");

        if (incomingData.warrantyStartDate && !isNaN(months)) {
            incomingData.warrantyEndDate = this.addMonths(incomingData.warrantyStartDate, months);
            delete incomingData.warrantyMonths;
        }

        if (!incomingData.productCode || String(incomingData.productCode).trim() === '') errors.push("شناسه کالا: نمی‌تواند خالی باشد");

        return { valid: errors.length === 0, errors, incomingData };
    }


    shamsiToStandard = (jDateString) => {
        const [jy, jm, jd] = jDateString.split('/').map(Number);

        const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);

        return new Date(gy, gm - 1, gd); 
    }

    addMonths = (date, months) => {
        const d = new Date(date.getTime()); 
        const targetMonth = d.getMonth() + months;

        d.setMonth(targetMonth);

        return d;
    }

    processIncomingDataOrder = (data) => {
        let result = [] ;
        for(let i = 0 ; i < data.length ; i++){
            const mapped = this.headerMap[data[i]];
            if(mapped) result.push([i , mapped]);
            else continue;
        }
        if(result.length != 9) return false ;

        return result ;
    }

    addToParseDataAndVAlidate = (data , order) => {
        const detailObject = {}
        for (let i = 0 ; i < order.length ; i++){
            if(data[order[i][0]]) detailObject[order[i][1]] = data[order[i][0]] ;
        }
        if(Object.keys(detailObject).length !== 9) return false ;
        const result = this.validateProductObject(detailObject);

        if(!result.valid) return false ;

        return result.incomingData ;
    }

    parseDetail = async (req , res , next) => {
        try{
            if (!req.file) return res.status(400).send('No file uploaded.');

            logger.info('start to change the excel to json file')
    
            const sheets = xlsx.parse(req.file.buffer);

            for(let j = 0 ; j < sheets.length ; j++){
                const sheet = sheets[j];

                if(sheet.data){

                    let order ;

                    if(JSON.stringify(sheet.data[0]) == "[]") continue ;
                    else {
                        const result = this.processIncomingDataOrder(sheet.data[0]) ;
                        if(!result) continue ;
                        order = result ;
                    }

                    for (let i = 1 ; i < sheet.data.length ; i++){
                        
                        if(JSON.stringify(sheet.data[i]) == "[]") continue ;

                        const fullDetail = this.addToParseDataAndVAlidate(sheet.data[i] , order);

                        if(!fullDetail) continue ;

                        this.parsedData.push(fullDetail);
                    }
                }
            }
            
            req.file = null ;

            if(this.parsedData.length < 1) {
                return res.status(400).send({message : "موردی برای افزودن وجود ندارد"})
            }

            req.excelData = {
                parsedData : this.parsedData
            }

            logger.info(`end the changeing the excel to json : jsonfile ${JSON.stringify(this.parsedData)}`)

        }catch (e) {
            console.log(e.message);
        }
        
        next();
    }
}

const middleware = new ExcelParserMiddleware();

module.exports = middleware;