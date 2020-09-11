require 'purecloudplatformclientv2'
gem 'test-unit'
require 'test/unit'
require 'securerandom'

class PureCloudGemTest < Test::Unit::TestCase
	@@has_error = false

	@@users_api = PureCloud::UsersApi.new

	@@user_id = nil
	@@user_email = nil
	@@user_name = 'Ruby SDK Tester'
	@@user_department = 'Ministry of Testing'
	@@user_profileSkill = 'Testmaster'

  def setup
  	if (@@has_error == true)
  		omit('Previous test case failed')
  	end
  end

  def teardown
  	if (passed? == false)
  		@@has_error = true
  	end
  end



  def test_1_trace_basic_information
    puts "PURECLOUD_ENVIRONMENT=" + ENV['PURECLOUD_ENVIRONMENT']
    assert_not_nil(ENV['PURECLOUD_ENVIRONMENT'])

    puts "PURECLOUD_CLIENT_ID=" + ENV['PURECLOUD_CLIENT_ID']
    assert_not_nil(ENV['PURECLOUD_CLIENT_ID'])

    assert_not_nil(ENV['PURECLOUD_CLIENT_SECRET'])

    @@user_email = "#{SecureRandom.uuid}@#{ENV['PURECLOUD_ENVIRONMENT']}"
    puts "user_email=#{@@user_email}"
  end

  def test_2_authenticate
    PureCloud.configure.debugging = false
    PureCloud.configure.host = "api.#{ENV['PURECLOUD_ENVIRONMENT']}"
    @authToken = PureCloud.authenticate_with_client_credentials ENV['PURECLOUD_CLIENT_ID'], ENV['PURECLOUD_CLIENT_SECRET'], ENV['PURECLOUD_ENVIRONMENT']

    assert_not_nil(@authToken)
  end

  def test_3_create_user
  	body = PureCloud::CreateUser.new
  	body.name = @@user_name
  	body.email = @@user_email
  	body.password = "#{SecureRandom.uuid}!@#$1234asdfASDF"

  	user = @@users_api.post_users(body)

  	@@user_id = user.id
  	assert_equal(@@user_name, user.name)
  	assert_equal(@@user_email, user.email)
  end

  def test_4_update_user
  	update_user = PureCloud::UpdateUser.new
  	update_user.department = @@user_department
  	update_user.version = 1

  	user = @@users_api.patch_user(@@user_id, update_user)

  	assert_equal(@@user_id, user.id)
  	assert_equal(@@user_name, user.name)
  	assert_equal(@@user_email, user.email)
  	assert_equal(@@user_department, user.department)
  end

  def test_5_set_profile_skills
  	skills = @@users_api.put_user_profileskills(@@user_id, [ @@user_profileSkill ])

  	assert_equal(1, skills.length)
  	assert_equal(@@user_profileSkill, skills[0])
  end

	def test_6_get_user
		user = @@users_api.get_user(@@user_id, { 'expand': [ 'profileSkills' ] })

  	assert_equal(@@user_id, user.id)
  	assert_equal(@@user_name, user.name)
  	assert_equal(@@user_email, user.email)
  	assert_equal(@@user_department, user.department)
  	assert_equal(@@user_profileSkill, user.profile_skills[0])
	end

	def test_7_delete_user
		@@users_api.delete_user(@@user_id)
	end
end
