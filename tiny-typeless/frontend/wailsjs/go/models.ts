export namespace main {
	
	export class Config {
	    provider: string;
	    api_key: string;
	    model: string;
	    proxy: string;
	
	    static createFrom(source: any = {}) {
	        return new Config(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.provider = source["provider"];
	        this.api_key = source["api_key"];
	        this.model = source["model"];
	        this.proxy = source["proxy"];
	    }
	}
	export class LogEntry {
	    timestamp: string;
	    level: string;
	    source: string;
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new LogEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.timestamp = source["timestamp"];
	        this.level = source["level"];
	        this.source = source["source"];
	        this.message = source["message"];
	    }
	}
	export class Statistics {
	    last_transcription_tokens: number;
	    total_transcription_tokens: number;
	
	    static createFrom(source: any = {}) {
	        return new Statistics(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.last_transcription_tokens = source["last_transcription_tokens"];
	        this.total_transcription_tokens = source["total_transcription_tokens"];
	    }
	}

}

