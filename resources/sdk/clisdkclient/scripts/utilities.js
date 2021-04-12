function processPath(path) { 
    return path
        .replace("_", "/")
        .replace(/[\/]{2,}/g, "/")
        .replace("/api/v2/documentation/", "/api/v2/documentationfile/")
        .replace("/api/v2/profiles/", "/api/v2/profile/")
}

module.exports = {
    processPath
}