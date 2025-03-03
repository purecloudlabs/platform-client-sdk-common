using System.Runtime.Serialization;

namespace {{=it.packageName}}.Extensions.Notifications
{
    ///<Summary>
    /// Notification (i.e. topic) Metadata
    ///</Summary>
    public class Metadata
    {
        ///<Summary>
        /// CorrelationId
        ///</Summary>
        [DataMember(EmitDefaultValue = false, Name = "CorrelationId")]
        public string CorrelationId { get; set; }
    }
}