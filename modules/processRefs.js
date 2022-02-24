module.exports = function processRefs(swagger) {
    const keys = Object.keys(swagger.definitions);
    keys.forEach((key, index) => {
        let obj = swagger.definitions[key].properties;
        if (obj) {
            const keys = Object.keys(swagger.definitions[key].properties);
            keys.forEach((key2, index) => {
                let obj2 = swagger.definitions[key].properties[key2];
                if (obj2) {
                    if (obj2.hasOwnProperty("$ref") && obj2.hasOwnProperty("readOnly")) {
                        let refObj = { "$ref": obj2.$ref };
                        obj2.allOf = [refObj];
                        delete obj2.$ref;
                    }
                }
            });
        }
    });
    return swagger
}
