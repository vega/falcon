declare type Rng = [number, number];

declare type Request = {
    id: string,
    type: 'query',
    dims: {[domain: string]: {
        // the domain (smallest and largest value) of the dimension
        domain: Rng,
        // the number of bins for this domain
        numBins: number
        // optional predicate, will not be applied to this domain but all others
        range?: Rng
    }},
    // which domain are we changing right now
    brushing?: string
} | {
    id: string,
    type: 'range',
    dims: string[]
};

declare type Result = {
    // multiple results for the same query
    id: string,
    type: 'query',
    dim: string,
    data: number[]
} | {
    type: 'range',
    id: string,
    ranges: {[dim: string]: Rng}
}


declare type Point = {
  x: number,
  y: number
};
