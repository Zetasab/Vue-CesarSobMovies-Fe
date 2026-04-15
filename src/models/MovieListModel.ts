import { MovieModel } from './MovieModel'

export class MovieListModel {
  page: number
  results: MovieModel[]
  totalPages: number
  totalResults: number

  constructor() {
    this.page = 0
    this.results = []
    this.totalPages = 0
    this.totalResults = 0
  }
}