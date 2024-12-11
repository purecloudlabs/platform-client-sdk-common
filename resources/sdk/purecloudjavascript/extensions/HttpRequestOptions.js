export class RequestOptions {

    // Mandatory fields with validation
     setUrl(value) {
        if (!value) throw new Error("The 'url' property is required");
        this.url = value;
    }


     setMethod(value) {
        const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
        if (!value || !validMethods.includes(value.toUpperCase())) {
            throw new Error("The 'method' property is invalid or missing");
        }
        this.method = value.toUpperCase();
    }



     setData(value) {
        if (value === undefined || value === null) {
            throw new Error("The 'data' property is required");
        }
        this.data = value;
    }


    // Optional fields
     setParams(value) {
        if (value && typeof value !== 'object') {
            throw new Error("The 'params' property must be an object");
        }
        this.params = value;
    }


    // Optional fields
    setHeaders(value) {
       if (value && typeof value !== 'object') {
          throw new Error("The 'params' property must be an object");
       }
       this.headers = value;
    }

     setTimeout(value) {
        if (value && typeof value !== 'number') {
            throw new Error("The 'timeout' property must be a number");
        }
        this.timeout = value;
    }

     setHttpsAgent(value) {
        if (value && typeof value !== 'object') {
                throw new Error("The 'httpsAgent' property must be a object");
       }
            this.httpsAgent = value;
    }

}

export default RequestOptions;