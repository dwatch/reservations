const express = require('express');
const ReserveController = require('./controllers/reserve.controller.js')

const router = express.Router()

//Login Pages
router.route("/viable_restaurants").get(ReserveController.GetViableRestaurants)
router.route("/reserve").post(ReserveController.Reserve)
router.route("/cancel").put(ReserveController.Cancel)

module.exports = router