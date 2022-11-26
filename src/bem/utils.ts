export class ParseError extends Error {
    location?: MyLocation;
    constructor(message: string, location?: MyLocation) {
        super(message);

        this.location = location;
    }
}

export class MyError {
    data: string;
    location?: MyLocation;
    constructor(data: string, location?: MyLocation) {
        this.data = data;
        this.location = location;
    }
}