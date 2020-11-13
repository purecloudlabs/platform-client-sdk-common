using System;
using System.Globalization;
using {{=it.packageName}}.Model;
using Newtonsoft.Json;

namespace {{=it.packageName}}.Client
{
    public class Iso8601DateTimeConverter : JsonConverter
    {
        public override bool CanConvert(Type objectType)
        {
            return (objectType == typeof(LocalDate)) || (objectType == typeof(DateTime)) || (objectType == typeof(DateTime?));
        }

        public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer)
        {
            if (value is LocalDate) 
            {
               var localDate = (LocalDate)value;
                if (localDate==null)
                    writer.WriteNull();
                else{
                    var dateString = localDate.ToString();
                    writer.WriteValue(dateString);
                }         
            }
            else
            {
                var date = (DateTime?)value;
                if (!date.HasValue)
                    writer.WriteNull();
                else
                {
                    var dateString = date.Value.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.FFFK", CultureInfo.InvariantCulture);
                    writer.WriteValue(dateString);
                }
            }
        }

        public override bool CanRead => false;

        public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
        {
            throw new NotImplementedException();
        }
    }
}
