package com.mypurecloud.sdk.v2

import com.mypurecloud.sdk.v2.ConsoleColors.applyTag
import org.testng.IInvokedMethod
import org.testng.IInvokedMethodListener
import org.testng.ITestResult
import org.testng.SkipException
import org.testng.internal.TestResult

class InvokedMethodListener : IInvokedMethodListener {
    private var hasFailure = false
    private var failureMethodName = ""
    override fun beforeInvocation(method: IInvokedMethod, result: ITestResult) {
        if (hasFailure) {   // https://github.com/cbeust/testng/issues/1632
                            // Bug in testng is causing skips to be reported as failures in afterInvocation
            result.status = TestResult.SKIP
            throw SkipException("Skipping " + method.testMethod.methodName + " due to failed test: " + failureMethodName)
        } else {
            println(applyTag(ConsoleColors.CYAN_BOLD, "TEST") + method.testMethod.methodName)
        }
    }

    override fun afterInvocation(method: IInvokedMethod, result: ITestResult) {
        when (result.status) {
            TestResult.SUCCESS -> {
                println(applyTag(ConsoleColors.GREEN_BOLD, "SUCCESS") + method.testMethod.methodName)
            }
            TestResult.SKIP -> {
                println(applyTag(ConsoleColors.YELLOW_BOLD, "SKIPPED") + method.testMethod.methodName)
            }
            TestResult.FAILURE -> {
                println(applyTag(ConsoleColors.RED_BOLD, "FAILED") + method.testMethod.methodName)
                hasFailure = true
                failureMethodName = method.testMethod.methodName
            }
        }
    }
}
