using System.Runtime.Serialization;

namespace {{=it.packageName}}.Extensions.Notifications
{
    public class NotificationData<T> : INotificationData
    {
        [DataMember(EmitDefaultValue = false, Name = "topicName")]
        public string TopicName { get; set; }

        [DataMember(EmitDefaultValue = false, Name = "version")]
        public string Version { get; set; }

        [DataMember(EmitDefaultValue = false, Name = "eventBody")]
        public T EventBody { get; set; }

        [DataMember(EmitDefaultValue = false, Name = "metadata")]
        public Metadata Metadata { get; set; }
    }
}
