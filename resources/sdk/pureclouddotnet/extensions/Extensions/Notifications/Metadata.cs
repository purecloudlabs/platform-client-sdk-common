using System.Runtime.Serialization;

namespace {{=it.packageName}}.Extensions.Notifications
{
    public class Metadata
    {
        [DataMember(EmitDefaultValue = false, Name = "CorrelationId")]
        public string CorrelationId { get; set; }
    }
}