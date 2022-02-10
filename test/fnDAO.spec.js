const { expect } = require('chai')
const reserveDAO = require("../controllers/fnDAO.js")
const {chg_hours} = require("../helpers/reserve.helper.js")


let reserve_id = null
let time = new Date("2022-02-10T21:30:00-05:00")
let diners = [1,2,3]
let tables = [35,36]
let other_diners = [4,5]
let other_rests = [1,2,3]
let rests = [5]

describe("fnDAO: post_reservation", () => {
  it('catch_bad_start_time', async () => {
    const result = await reserveDAO.post_reservation(null, tables, diners)
    expect(result).to.be.null
  })
  it('catch_bad_tables', async () => {
    const result = await reserveDAO.post_reservation(time, [1,2,"a"], diners)
    expect(result).to.be.null
  })
  it('catch_bad_diners', async () => {
    const result = await reserveDAO.post_reservation(time, tables, [1,2,"a"])
    expect(result).to.be.null
  })
  it('make_reservation', async () => {
    reserve_id = await reserveDAO.post_reservation(time, tables, diners)
    const result = await reserveDAO.find_reservation(reserve_id)
    expect(result['id']).to.be.eq(reserve_id)
  })
})

describe("fnDAO: find_reservation", () => {
  it('catch_bad_reserve_id', async () => {
    const result = await reserveDAO.find_reservation(null)
    expect(result).to.be.null
  })
  it('find_matching_reservation', async () => {
    const result = await reserveDAO.find_reservation(reserve_id)
    expect(result['id']).to.be.eq(reserve_id)
  })
})

describe("fnDAO: get_dietary_restrictions", () => {
  it('catch_bad_diner_ids', async () => {
    const result = await reserveDAO.get_dietary_restrictions(null)
    expect(result).to.be.null
  })
  it('get_single_diner', async () => {
    const diner = [1]
    const exp_allergy = 2
    const result = await reserveDAO.get_dietary_restrictions(diner)
    expect(result).to.be.eq(exp_allergy)
  })
  it('get_multiple_diners', async () => {
    const diners = [1,2,3,4]
    const exp_allergy = 7
    const result = await reserveDAO.get_dietary_restrictions(diners)
    expect(result).to.be.eq(exp_allergy)
  })
})

describe("fnDAO: get_viable_restaurants", () => {
  it('catch_bad_diet_restrict', async () => {
    const result = await reserveDAO.get_viable_restaurants(null)
    expect(result).to.be.null
  })
  it('all_chosen_restaurants_can_cater', async () => {
    const diet_restrict = 3
    const result = await reserveDAO.get_viable_restaurants(diet_restrict)
    let all_restricts = result.map((r) => (r["diet_restrict"] | diet_restrict) === r["diet_restrict"])
    expect(all_restricts.every(v => v === true)).to.be.true
  })
})

describe("fnDAO: get_available_restaurants", () => {
  it('catch_bad_args', async () => {
    const badDiners = await reserveDAO.get_available_restaurants(null, rests, time)
    const badRests = await reserveDAO.get_available_restaurants(diners.length, null, time)
    const badTime = await reserveDAO.get_available_restaurants(diners.length, rests, null)
    const result = !badDiners && !badRests && !badTime
    expect(result).to.be.true
  })
  it('restaurant_has_no_space', async () => {
    const result = await reserveDAO.get_available_restaurants(diners.length, rests, time)
    expect(result.length).to.be.eq(0)
  })
  it('restaurant_has_space', async () => {
    const result = await reserveDAO.get_available_restaurants(diners.length, other_rests, time)
    expect(result.length).to.be.eq(3)
  })
})

describe("fnDAO: get_available_tables", () => {
  it('catch_bad_args', async () => {
    const badRest = await reserveDAO.get_available_tables(null, time)
    const badTime = await reserveDAO.get_available_tables(rests, null)
    const result = !badRest && !badTime
    expect(result).to.be.true
  })
  it('no_tables_available', async () => {
    const result = await reserveDAO.get_available_tables(rests[0], time)
    expect(result.length).to.be.eq(0)
  })
  it('tables_available', async () => {
    const result = await reserveDAO.get_available_tables(other_rests[0], time)
    expect(result.length).to.be.greaterThan(0)
  })
})

describe("fnDAO: get_diner_reservations", () => {
  it('catch_bad_args', async () => {
    const badDiners = await reserveDAO.get_diner_reservations(null, time)
    const badTime = await reserveDAO.get_diner_reservations(diners, "meh")
    const result = !badDiners && !badTime
    expect(result).to.be.true
  })
  it('diners_with_no_reservation', async () => {
    const result = await reserveDAO.get_diner_reservations(other_diners, time)
    expect(result.length).to.be.eq(0)
  })
  it('diners_with_reservation', async () => {
    const result = await reserveDAO.get_diner_reservations(diners, time)
    expect(result.length).to.be.eq(diners.length)
  })
  it('diners_with_reservation_diff_time', async () => {
    const result = await reserveDAO.get_diner_reservations(diners, chg_hours(new Date(), -4) ) 
    expect(result.length).to.be.eq(0)   
  })
})

describe("fnDAO: del_reservation", () => {
  it('catch_bad_reserve_id', async () => {
    const result = await reserveDAO.del_reservation(null)
    expect(result).to.be.null
  })
  it('delete_reservation', async () => {
    const result = await reserveDAO.del_reservation(reserve_id)
    expect(result).to.be.true
  })
})
