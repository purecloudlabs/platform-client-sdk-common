using System;
using System.Collections.Generic;
using {{=it.packageName}}.Model;
using WebSocketSharp;

namespace {{=it.packageName }}.Model
{
	public interface IPagedResource<T>
	{
        int? PageSize { get; set; }
        int? PageNumber { get; set; }
        long? Total { get; set; }
        string SelfUri { get; set; }
        string FirstUri { get; set; }
        string PreviousUri { get; set; }
        string NextUri { get; set; }
        string LastUri { get; set; }
        int? PageCount { get; set; }
        List<T> Entities { get; set; }
	}
}