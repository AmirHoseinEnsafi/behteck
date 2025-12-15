const queryService = require('./query.service');

class GetQueryController {
    constructor(_service){
        this.service = _service;
    }

    handler = async (req , res) => {
        const filters = req.income ;

        const result = await this.service.queryData(filters);

        res.status(200).send(result);
    }
}

const queryController = new GetQueryController(queryService);

module.exports = queryController ;