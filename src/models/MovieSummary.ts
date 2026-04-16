export interface MovieSummary {
  id: number
  title: string | null
  original_title: string | null
  overview: string | null
  poster_path: string | null
  backdrop_path: string | null
  release_date: string | null
  vote_average: number
  vote_count: number
  popularity: number
  original_language: string | null
  genre_ids: number[]
  adult: boolean
  video: boolean
}
