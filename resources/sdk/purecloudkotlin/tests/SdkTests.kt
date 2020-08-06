package com.mypurecloud.sdk.v2

import com.mypurecloud.sdk.v2.Configuration.defaultApiClient
import com.mypurecloud.sdk.v2.ConsoleColors.applyTag
import com.mypurecloud.sdk.v2.api.PresenceApi
import com.mypurecloud.sdk.v2.api.UsersApi
import com.mypurecloud.sdk.v2.extensions.notifications.NotificationHandler
import com.mypurecloud.sdk.v2.model.CreateUser
import com.mypurecloud.sdk.v2.model.PresenceDefinition
import com.mypurecloud.sdk.v2.model.UpdateUser
import com.mypurecloud.sdk.v2.model.UserPresence
import org.testng.Assert
import org.testng.annotations.AfterTest
import org.testng.annotations.BeforeTest
import org.testng.annotations.Test
import java.util.*

class SdkTests {
    private var apiClient: ApiClient? = null
    private var usersApi: UsersApi? = null
    private var presenceApi: PresenceApi? = null
    private var userId: String? = null
    private var userEmail: String? = null
    private val userName = "Kotlin SDK Tester"
    private val userDepartment = "Ministry of Testing"
    private val userProfileSkill = "Testmaster"
    private val busyPresenceId = "31fe3bac-dea6-44b7-bed7-47f91660a1a0"
    private val availablePresenceId = "6a3af858-942f-489d-9700-5f9bcdcdae9b"
    private var environment: String? = null
    private var region: PureCloudRegionHosts? = null
    private var useenum = true
    @BeforeTest
    fun beforeTest() {
        println("Before test")
    }

    @Test(priority = 1)
    fun traceBasicInformation() {
        region = getEnvironment()
        if (region == null) {
            useenum = false
        }
        println("PURECLOUD_ENVIRONMENT=$environment")
        Assert.assertNotNull(environment)
        println("PURECLOUD_CLIENT_ID=$clientId")
        Assert.assertNotNull(clientId)
        Assert.assertNotNull(clientSecret)
        userEmail = UUID.randomUUID().toString() + "@" + environment
        println("userEmail=$userEmail")
    }

    @Test(priority = 2)
    fun authenticate() {
        try {
            var builder = ApiClient.Builder.standard()
            builder = if (useenum) {
                builder.withBasePath(region!!)
            } else {
                builder.withBasePath("https://api.$environment")
            }
            apiClient = builder.build()
            val authResponse = apiClient!!.authorizeClientCredentials(clientId, clientSecret)
            defaultApiClient = apiClient
            Assert.assertNotNull(authResponse.getBody()!!.access_token)
            usersApi = UsersApi()
            presenceApi = PresenceApi()
        } catch (ex: ApiException) {
            handleApiException(ex)
        } catch (ex: Exception) {
            println(ex)
            Assert.fail()
        }
    }

    @Test(priority = 3)
    fun createUser() {
        try {
            val newUser = CreateUser()
            newUser.name(userName).email(userEmail!!).password(UUID.randomUUID().toString() + "!@#$1234asdfASDF")
            val user = usersApi!!.postUsers(newUser)
            userId = user!!.id
            Assert.assertEquals(user.name, userName)
            Assert.assertEquals(user.email, userEmail)
            println("Created user with ID $userId")
        } catch (ex: ApiException) {
            handleApiException(ex)
        } catch (ex: Exception) {
            println(ex)
            Assert.fail()
        }
    }

    @Test(priority = 4)
    fun updateUser() {
        try {
            val updateUser = UpdateUser()
            updateUser.department(userDepartment).version(1)
            val user = usersApi!!.patchUser(userId!!, updateUser)
            Assert.assertEquals(user!!.id, userId)
            Assert.assertEquals(user.name, userName)
            Assert.assertEquals(user.email, userEmail)
            Assert.assertEquals(user.department, userDepartment)
        } catch (ex: ApiException) {
            handleApiException(ex)
        } catch (ex: Exception) {
            println(ex)
            Assert.fail()
        }
    }

    @Test(priority = 5)
    fun setProfileSkills() {
        try {
            val skills = usersApi!!.putUserProfileskills(userId!!, mutableListOf(userProfileSkill))
            Assert.assertEquals(skills!!.size, 1)
            Assert.assertEquals(skills[0], userProfileSkill)
        } catch (ex: ApiException) {
            handleApiException(ex)
        } catch (ex: Exception) {
            println(ex)
            Assert.fail()
        }
    }

    @Test(priority = 6)
    fun testNotifications() {
        try { // Set up notification handler
            val listener = UserPresenceListener(userId!!)
            NotificationHandler.Builder.standard()
                    .withNotificationListener(listener)
                    .withAutoConnect(false)
                    .build()
            // Set presence to busy
            presenceApi!!.patchUserPresence(userId!!, "PURECLOUD", createUserPresence(busyPresenceId))
            // Wait for notification
            var presenceSet = false
            var c = 0
            while (!presenceSet && c < 500) {
                c++
                Thread.sleep(10)
                if (busyPresenceId == listener.presenceId) presenceSet = true
            }
            // Verify
            Assert.assertEquals(listener.presenceId, busyPresenceId)
            // Set presence to available
            presenceApi!!.patchUserPresence(userId!!, "PURECLOUD", createUserPresence(availablePresenceId))
            // Wait for notification
            presenceSet = false
            c = 0
            while (!presenceSet && c < 500) {
                c++
                Thread.sleep(10)
                if (availablePresenceId == listener.presenceId) presenceSet = true
            }
            // Verify
            Assert.assertEquals(listener.presenceId, availablePresenceId)
        } catch (ex: ApiException) {
            handleApiException(ex)
        } catch (ex: Exception) {
            println(ex)
            Assert.fail()
        }
    }

    @get:Test(priority = 7)
    val user: Unit
        get() {
            try {
                val user = usersApi!!.getUser(userId!!, mutableListOf("profileSkills"), null, null)
                Assert.assertEquals(user!!.id, userId)
                Assert.assertEquals(user.name, userName)
                Assert.assertEquals(user.email, userEmail)
                Assert.assertEquals(user.department, userDepartment)
                Assert.assertEquals(user.profileSkills!![0], userProfileSkill)
            } catch (ex: ApiException) {
                handleApiException(ex)
            } catch (ex: Exception) {
                println(ex)
                Assert.fail()
            }
        }

    @Test(priority = 8)
    fun deleteUser() {
        try {
            usersApi!!.deleteUser(userId!!)
        } catch (ex: ApiException) {
            handleApiException(ex)
        } catch (ex: Exception) {
            println(ex)
            Assert.fail()
        }
    }

    @AfterTest
    fun afterTest() {
        println("After test")
    }

    private fun getEnvironment(): PureCloudRegionHosts? {
        environment = System.getenv("PURECLOUD_ENVIRONMENT")
        return when (environment) {
            "mypurecloud.com" -> PureCloudRegionHosts.us_east_1
            "mypurecloud.ie" -> PureCloudRegionHosts.eu_west_1
            "mypurecloud.com.au" -> PureCloudRegionHosts.ap_southeast_2
            "mypurecloud.jp" -> PureCloudRegionHosts.ap_northeast_1
            "mypurecloud.de" -> PureCloudRegionHosts.eu_central_1
            "usw2.pure.cloud" -> PureCloudRegionHosts.us_west_2
            "cac1.pure.cloud" -> PureCloudRegionHosts.ca_central_1
            "apne2.pure.cloud" -> PureCloudRegionHosts.ap_northeast_2
            "euw2.pure.cloud" -> PureCloudRegionHosts.eu_west_2
            else -> {
                println("Not in PureCloudRegionHosts using string value")
                null
            }
        }
    }

    private val clientId: String
        get() = System.getenv("PURECLOUD_CLIENT_ID")

    private val clientSecret: String
        get() = System.getenv("PURECLOUD_CLIENT_SECRET")

    private fun handleApiException(ex: ApiException) {
        println(applyTag(ConsoleColors.RED_BOLD, "API Exception") +
                "(" + ex.getCorrelationId() + ") " +
                ex.statusCode + " " + ex.getStatusReasonPhrase() + " - " + ex.rawBody)
        Assert.fail(ex.statusCode.toString() + " " + ex.getStatusReasonPhrase() + " (" + ex.getCorrelationId() + ")")
    }

    private fun createUserPresence(presenceId: String): UserPresence {
        val pd = PresenceDefinition()
        pd.id = presenceId
        val up = UserPresence()
        up.presenceDefinition = pd
        return up
    }
}
