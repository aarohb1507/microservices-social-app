const User = require('../models/User')
const { generateTokens } = require('../utils/generateToken')
const logger = require('../utils/Logger')
const {validateRegistration} = require('../utils/validation')
const {validateLogin} = require('../utils/validation')
const {RefreshToken} = require('../models/RefreshTokens')

//user-registeration

const registerUser = async (req, res, next) => {
    logger.info("Hit registerUser endpoint")
    try {
        const {error} = validateRegistration(req.body)
        if (error){
            logger.warn("Validation failed during user registration: %s", error.details[0].message)
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: error.details.map(err => ({
                    field: err.context.key,
                    message: err.message
                }))
            })
        }
        const { username, email, password } = req.body
        let user = await User.findOne({ $or: [ { email }, { username } ] })
        if (user){
            logger.warn("Registration attempt with existing email or username: %s, %s", email, username)
            return res.status(409).json({
                success: false,
                message: "Email or Username already in use"
            })
        }
        user = new User({username, email, password})
        await user.save()
        logger.warn("New user registered: %s", user._id)
        const { accessToken, refreshToken } = await generateTokens(user)
        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                accessToken,
                refreshToken
            }
        })
    } catch (error) {
         logger.error("Error during user registration: %s", error.message)
         return res.status(500).json({
            success: false,
            message: "Internal Server Error"
         })
    }

}

//user-login
const loginUser = async (req, res, next) => {
    logger.info("Hit loginUser endpoint")
    try{
        const {error} = validateLogin(req.body)
        if (error){
            logger.warn("Validation failed during user login: %s", error.details[0].message)
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: error.details.map(err => ({
                    field: err.context.key,
                    message: err.message
                }))
            })
        }
         const {email, password} = req.body
         const user = await User.findOne({email})
         if (!user){
            logger.warn("Login attempt with unregistered email: %s", email)
            return res.status(401).json({
                success: false,
                message: "The email does not exist."
            })
         }
         //check for password match
        const isMatch = await user.comparePassword(password)
        if (!isMatch){
            logger.warn("Invalid password attempt for email: %s", email)
            return res.status(401).json({
                success: false,
                message: "Invalid password."
            })
        }
        //if the password matches
        const {accessToken, refreshToken} = await generateTokens(user)
        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                accessToken,
                refreshToken
            }
        })

    }catch(error){
        logger.error("Error during user login: %s", error.message)
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        })
    }
}
//refresh-token
const refreshTokenUser = async (req, res, next) => {
    try {
        logger.info("Hit refreshTokenUser endpoint")
    //implementation pending
    const {refreshToken} = req.body
    if (!refreshToken){
        logger.warn("Refresh token not provided in request")
        return res.status(400).json({
            success: false,
            message: "Refresh token is required"
        })
    }
    //further implementation needed
    const storedToken = await RefreshToken.findOne({token: refreshToken})
    if (!storedToken){
        logger.warn("Invalid refresh token attempt: %s", refreshToken)
        return res.status(401).json({
            success: false,
            message: "Invalid refresh token"
        })
    }
    //additional logic to generate new tokens goes here
    if(storedToken.expiresAt < new Date()){
        logger.warn("Expired refresh token attempt: %s", refreshToken)
        return res.status(401).json({
            success: false,
            message: "Refresh token has expired"
        })
    }
    //generate new tokens
    const user = await User.findById(storedToken.user)
    if (!user){
        logger.warn("User not found for refresh token: %s", refreshToken)
        return res.status(404).json({
            success: false,
            message: "User not found"
        })
    }
    const {accessToken:newAccessToken, refreshToken: newRefreshToken} = await generateTokens(user)
    //delete old refresh token
    await RefreshToken.deleteOne({_id: storedToken._id})
    return res.status(200).json({
        success: true,
        message: "Tokens refreshed successfully",
        data: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        }
    })


} catch (error) {
        logger.error("Error during refresh token processing: %s", error.message)
         return res.status(500).json({
            success: false,
            message: "Internal Server Error"
         })
    }
    
}
//logout

const logoutUser = async (req, res, next) => {
    //implementation pending
    logger.info("Hit logoutUser endpoint")
    try {
        const {refreshToken} = req.body
    if (!refreshToken){
        logger.warn("Refresh token not provided in logout request")
        return res.status(400).json({
            success: false,
            message: "Refresh token is required"
        })
    }
    await RefreshToken.deleteOne({token: refreshToken})
    logger.info("User logged out successfully, refresh token invalidated: %s", refreshToken)
    return res.status(200).json({
        success: true,
        message: "Logged out successfully"
    })
    } catch (error) {
        logger.error("Error during logging out: %s", error.message)
         return res.status(500).json({
            success: false,
            message: "Internal Server Error"
         })
    }
}

module.exports = {
    registerUser, loginUser, refreshTokenUser, logoutUser
}