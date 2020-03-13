
import { ApplicationConfig } from './metadata';
import { Series } from "./models/Series";
import { DataseriesRouter } from './routers/Dataseries';


export const App = function(express,
                            helmet, 
                            httpLogger, 
                            cors, 
                            config : ApplicationConfig, 
                            slugify) {

  let app = express();
  app.use(helmet());
  app.use(httpLogger);
  
  let seriesMap: {
    [key: string] : Series
  } = {};

  config.series.forEach(s => {
    if (s.slug === undefined) {
      s.slug = slugify(s.name, { lower: true });
    }
    seriesMap[s.slug] = s;
  })

  config.series.forEach(series => {
    console.log(series.name);
    if (series.slug !== undefined) {
      console.log("also, slug is " + series.slug);
    }
  });

  app.get('/keys', cors(), (_, res, __) => {
    res.json({
      'keys': config.labels.key
    });
  });

  app.get('/key/:key/values', cors(), (req, res, __) => {
    let key = req.params.key.toLowerCase();
    let matched_values = config.domain.find(v => v.key == key).domain_values;
    if (matched_values === undefined) {
      res.sendStatus(404);
      return;
    }
    res.json({
      'values': matched_values
    });
  });

  app.get('/range/values', cors(), (_, res, __) => {
    res.json({
      'range': config.labels.range
    });
  });

  app.get('/special/values', cors(), (_, res, __) => {
    res.json({
      'special': config.labels.special
    })
  });

  app.use('/dataseries', cors(), DataseriesRouter(seriesMap, cors));
  
  app.use((_, res, __) => {
    res.sendStatus(404);
  });

  app.use((err, _, res, __) => {
    console.error(err);
    res.sendStatus(500);
  });

  return app;
}