using System;
using {{= it.packageName}}.Model;

namespace {{=it.packageName }}.Model
{
  /// <summary>
  /// The LocalDate class is a wrapper class that maps the Genesys Cloud swagger definition to a Date only class.
  /// This class written to deal with DEVENGAGE-338 where a customer raised an issue where they were getting improperly
  /// formatted Dates (e.g. with a timestamp) because the default serialization for a LocalDate was to serialize to a 
  /// DateTime.
  /// </summary>  
public class LocalDate
{
  private DateTime dateTime;

  public LocalDate(DateTime dateTime)
  {
    this.dateTime = dateTime;
  }

  public override string ToString()
  {
    return this.dateTime.Date.ToString("yyyy-MM-dd");
  }
}
}  