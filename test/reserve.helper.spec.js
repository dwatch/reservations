const { expect } = require('chai')
const {chg_hours, choose_tables} = require("../helpers/reserve.helper.js")

let mock_time = new Date("2022-02-10T21:30:00-05:00")
let mock_table = [{"id": 1, "capacity": 6}, 
                  {"id": 2, "capacity": 4}, 
                  {"id": 3, "capacity": 2}, 
                  {"id": 4, "capacity": 2} ]
const two_hrs = 1000 * 60 * 60 * 2

describe("helper: chg_hours", () => {
  it('catch_bad_time', () => {
    const badTime = chg_hours(null, 15)
    expect(badTime).to.be.null
  })
  it('catch_bad_shift', () => {
    const badShift = chg_hours(mock_time, null)
    expect(badShift).to.be.null
  })
  it('shift_0_hrs', () => {
    const shift = chg_hours(mock_time, 0)
    expect(shift).to.deep.eq(mock_time)
  })
  it('shift_fwd_2_hrs', () => {
    const shift = chg_hours(mock_time, 2)
    expect(shift).to.deep.eq(new Date(mock_time.getTime() + two_hrs))
  })
  it('shift_back_2_hrs', () => {
    const shift = chg_hours(mock_time, -2)
    expect(shift).to.deep.eq(new Date(mock_time.getTime() - two_hrs))
  })
})

describe("helper: choose_tables", () => {
  it('catch_bad_num_diners', () => {
    const badDiners = choose_tables(null, mock_table)
    expect(badDiners).to.be.null
  })
  it('catch_bad_shift', () => {
    const n_diners = 14
    const badTable = choose_tables(n_diners, null)
    expect(badTable).to.be.null
  })
  it('more_diners_than_chairs', () => {
    const n_diners = 15
    const tables = choose_tables(n_diners, mock_table)
    expect(tables).to.null
  })
  it('just_enough_diners', () => {
    const n_diners = 14
    const tables = choose_tables(n_diners, mock_table)
    expect(tables).to.deep.eq(mock_table.map((t) => t["id"]))
  })
  it('fewer_diners_than_chairs', () => {
    const n_diners = 11
    const tables = choose_tables(n_diners, mock_table)
    let caps = 0
    for (let t of mock_table) {
      if ( tables.includes(t["id"]) ) {
        caps += t["capacity"]
      }
    }
    expect(n_diners).to.be.lessThanOrEqual(caps)
  })
})