using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Reflection;
using System.Text.RegularExpressions;
using {{=it.packageName}}.Model;

namespace {{=it.packageName}}.Client

{
   
    public enum PureCloudRegionHosts {
        [Description("https://api.mypurecloud.com")]
        us_east_1,
        [Description("https://api.mypurecloud.ie")]
        eu_west_1,
        [Description("https://api.mypurecloud.de")]
        eu_central_1,
        [Description("https://api.mypurecloud.jp")]
        ap_northeast_1,
        [Description("https://api.mypurecloud.com.au")]
        ap_southeast_2,
        [Description("https://api.usw2.pure.cloud")]
        us_west_2,
        [Description("https://api.cac1.pure.cloud")]
        ca_central_1,
        [Description("https://api.apne2.pure.cloud")]
        ap_northeast_2,
        [Description("https://api.euw2.pure.cloud")]
        eu_west_2,
        [Description("https://api.aps1.pure.cloud")]
        ap_south_1,
        [Description("https://api.use2.us-gov-pure.cloud")]
        us_east_2,
        [Description("https://api.sae1.pure.cloud")]
        sa_east_1,
        [Description("https://api.mec1.pure.cloud")]
        me_central_1,
        [Description("https://api.apne3.pure.cloud")]
        ap_northeast_3,
        [Description("https://api.euc2.pure.cloud")]
        eu_central_2,

    }

    public static class EnumExtensionMethods
    {
        public static string GetDescription(this Enum GenericEnum)
        {
            Type genericEnumType = GenericEnum.GetType();
            MemberInfo[] memberInfo = genericEnumType.GetMember(GenericEnum.ToString());
            if ((memberInfo != null && memberInfo.Length > 0))
            {
                var _Attribs = memberInfo[0].GetCustomAttributes(typeof(System.ComponentModel.DescriptionAttribute), false);
                if ((_Attribs != null && _Attribs.Count() > 0))
                {
                    return ((System.ComponentModel.DescriptionAttribute)_Attribs.ElementAt(0)).Description;
                }
            }
            return GenericEnum.ToString();
        }

    }
}