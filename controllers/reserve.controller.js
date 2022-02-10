const reserveDAO = require('./fnDAO.js')
const args = require('../helpers/args.helper.js')
const lib = require('../helpers/reserve.helper.js')

class ReserveController {  
  static #PK = "id"
  static #CANCEL_DT = "ts_cancelled"
  
  static async GetViableRestaurants(req, res) {
    //Logging
    let meta = {filename: 'reserve.controller.js', funcName:'GetViableRestaurants'}
    reserveDAO.reserve_logger.info('GetViableRestaurants', {filename: 'reserve.conroller.js'})
    //Organize and Check Inputs
    const diners = (typeof req.body.diner_ids === 'string') ? [req.body.diner_ids] : req.body.diner_ids
    const start_time = new Date(req.body.start_time)
    if (!diners || !start_time || !args.isNumList(diners) || !args.isDate(start_time)) {
      reserveDAO.reserve_logger.error('ill-defined parameters', meta)
      return res.json({"error":"Improper Inputs"}) 
    }
    //Get all allergies of group
    reserveDAO.reserve_logger.info('query: get_dietary_restrictions', meta)
    let group_diet_restricts = await reserveDAO.get_dietary_restrictions(diners)
    if (group_diet_restricts === null) { 
      return res.json({"error":"Unable to get group members' dietary restrictions"}) 
    }
    //Get get restaurants that take those allergies
    reserveDAO.reserve_logger.info('query: get_viable_restaurants', meta)
    let viable_restaurants = await reserveDAO.get_viable_restaurants(group_diet_restricts)
    if (!viable_restaurants) { 
      return res.json({"error":"Unable to query restaurants that handle all dietary restrictions"}) 
    }
    //For each viable restaurant, get available capacity
    reserveDAO.reserve_logger.info('query: get_available_restaurants', meta)
    let rest_ids = viable_restaurants.map((restaurant) => restaurant[this.#PK])
    let available_restaurants = await reserveDAO.get_available_restaurants(diners.length, rest_ids, start_time)
    if (!available_restaurants) { 
      return res.json({"error":"Unable to query restaurants with available seating"}) 
    }
    //Return the restaurants that have enough capacity to fit everyone
    res.json(available_restaurants)
  }
  
  static async Reserve(req, res) {
    //Logging
    let meta = {filename: 'reserve.controller.js', funcName:'Reserve'}
    reserveDAO.reserve_logger.info('Reserve', {filename: 'reserve.conroller.js'})
    //Organize and Check Inputs
    const diners = (typeof req.body.diner_ids === 'string') ? [req.body.diner_ids] : req.body.diner_ids
    const start_time = new Date(req.body.start_time)
    const rest_id = req.body.restaurant_id
    if (!diners || !start_time || !rest_id || 
        !args.isNumList(diners) || !args.isDate(start_time) || !args.isNum(rest_id)) {
      reserveDAO.reserve_logger.error('ill-defined parameters', meta)
      return res.json({"error":"Improper Inputs"}) 
    }
    //See if anyone has existing reservations
    reserveDAO.reserve_logger.info('query: get_diner_reservations', meta)
    let existing_reservations = await reserveDAO.get_diner_reservations(diners, start_time)
    if (!existing_reservations) { 
      return res.json({"error": "Unable to check existing reservations"})
    } else if (existing_reservations.length > 0) { 
      return res.json({"error":"Group members have existing overlapping reservations"})
    }
    //Get all available tables at the restaurant
    reserveDAO.reserve_logger.info('query: get_available_tables', meta)
    let tables_available = await reserveDAO.get_available_tables(rest_id, start_time)
    if (!tables_available) { 
      return res.json({"error": "Unable to get available tables"}) 
    }
    let tables_chosen = lib.choose_tables(diners.length, tables_available)
    //Make reservation
    reserveDAO.reserve_logger.info('query: post_reservation', meta)
    let reserve = await reserveDAO.post_reservation(start_time, tables_chosen, diners)
    if (!reserve) { 
      return res.json({"error": "Unable to make reservation"}) 
    }
    return res.json({"message":"Reservations created", "reservation_id":reserve})
  }

  static async Cancel(req, res) {
    //Logging
    let meta = {filename: 'reserve.controller.js', funcName:'Cancel'}
    reserveDAO.reserve_logger.info('Cancel', {filename: 'reserve.controller.js'})
    //Organize and Check Inputs
    const reservation_id = req.body.reservation_id
    if (!reservation_id || !args.isNum(reservation_id)) {
      return res.json({"error":"Improper Inputs"}) 
    }
    //See if the reservation already exists
    reserveDAO.reserve_logger.info('query: find_reservation', meta)
    let existing = await reserveDAO.find_reservation(reservation_id)
    if (!existing) {
      return res.json({"error":"Reservation not found"})
    } else if (existing[this.#CANCEL_DT]) {
      return res.json({"message":"Reservation already cancelled"})
    }
    //Delete the reservation if it exists and not already cancelled
    reserveDAO.reserve_logger.info('query: del_reservation', meta)
    let deleted = await reserveDAO.del_reservation(reservation_id)
    if (!deleted) { 
      return res.json({"error":"Reservation found, but unable to cancel"}) 
    }
    return res.json({"message":"Reservation cancelled"}) 
  }
}

module.exports = ReserveController


