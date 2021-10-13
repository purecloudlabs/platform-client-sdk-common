package models

import (
	"fmt"
)

type ImplicitWebpage struct {}

func (w ImplicitWebpage) GetImplicitWebpage(clientID string, environment string, redirectURI string) string {
	return fmt.Sprintf(AuthWebpage, clientID, redirectURI, environment)
}

const AuthWebpage = `
<html>
<head>
    <title>Implicit Login</title>

    <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
    <script>
        function getParameterByName(name) {
            name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
            var regex = new RegExp("[\\#&]" + name + "=([^&#]*)"),
                results = regex.exec(location.hash);
            return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
        }

        if(window.location.hash) {
            axios.get("/access_token/" + getParameterByName('access_token') + "/expires_in/" + getParameterByName('expires_in') + "/token_type/" + getParameterByName('token_type'));
            location.hash=''
        } else {
            var queryStringData = {
                response_type : "token",
                client_id : "%s",
                redirect_uri : "%s"
            }
            let encodedURL = new URLSearchParams(queryStringData);
            window.location.replace("https://login.%s/oauth/authorize?" + encodedURL.toString());
        }
    </script>

    </head>
    <body>
        <div>
            <p>Authentication complete.</p>
        </div>
    </body>
</html>
`
