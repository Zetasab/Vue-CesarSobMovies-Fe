import { BaseEntity } from './BaseEntity'

export class MovieModel extends BaseEntity {
  title: string
  idTMDB: number
  originalTitle: string
  overview: string
  posterPath: string
  backdropPath: string
  releaseDate: string
  voteAverage: number
  voteCount: number
  adult: boolean
  originalLanguage: string
  popularity: number
  isLiked: boolean
  isWatched: boolean
  isSeen: boolean

  constructor() {
    super()
    this.title = ''
    this.idTMDB = 0
    this.originalTitle = ''
    this.overview = ''
    this.posterPath = ''
    this.backdropPath = ''
    this.releaseDate = ''
    this.voteAverage = 0
    this.voteCount = 0
    this.adult = false
    this.originalLanguage = ''
    this.popularity = 0
    this.isLiked = false
    this.isWatched = false
    this.isSeen = false
  }
}