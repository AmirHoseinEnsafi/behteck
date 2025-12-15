const productService = require('./createDetail.service');

class ReceiveNewDetail {
    constructor(_service){
        this.service = _service;
    }

    handler = async (req , res) => {
        const {parsedData} = req.excelData ;

        const result = await this.service.processParsedData(parsedData);

        res.status(201).json(result);
    }
}

const receiveDetail = new ReceiveNewDetail(productService);

module.exports = receiveDetail