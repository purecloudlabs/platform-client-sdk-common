package com.mypurecloud.sdk.v2

import com.mypurecloud.sdk.v2.model.Evaluation

interface PagedResource<T> {
    var entities: MutableList<T>?
    var pageSize: Int?
    var pageNumber: Int?
    var pageCount: Int?
    var total: Long?
    var firstUri: String?
    var previousUri: String?
    var selfUri: String?
    var nextUri: String?
    var lastUri: String?
}
