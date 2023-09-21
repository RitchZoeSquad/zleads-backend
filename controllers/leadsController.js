const axios = require("axios");
const asyncHandler = require("express-async-handler")
const data = require("../data/GoogleApiResponse.json")
const outscraperData = require("../data/OutscraperResponse.json")
const XLSX = require("xlsx");
const uuid = require('uuid'); // Import the uuid package
const dynamodb = require("../config/db");


async function generateSearchUID() {
  // Generate a unique UID for each search
  return uuid.v4();
}

async function TombaDomainSearch(company) {
  if (company && company.website) {

    try {
      const { website } = company;
      const url = `https://api.tomba.io/v1/domain-search?domain=${company.website}`;
      const headers = {
        'Content-Type': 'application/json',
        'X-Tomba-Key': process.env.TOMBA_API_KEY,
        'X-Tomba-Secret': process.env.TOMBA_API_SECRET
      };

      const res = await axios.get(url, { headers });
      let data = res?.data?.data;
      data.emails = data.emails.slice(0, 2)

      const result = {};
      result[website] = data;

      return result;

    } catch (e) {
      console.log("error while fetching domain search")
    }
  }
}
async function TombaEmailVerification(company, uid) {
  if (company && company.emails.length !== 0) {
    let arr = []

    try {
      for (const item of company.emails) {

        const url = `https://api.tomba.io/v1/email-verifier/${item.email}`;
        const headers = {
          'Content-Type': 'application/json',
          'X-Tomba-Key': process.env.TOMBA_API_KEY,
          'X-Tomba-Secret': process.env.TOMBA_API_SECRET
        };

        const res = await axios.get(url, { headers });
        const data = res?.data?.data;


        let count = uid.toString().padStart(3, '0');
        data["uid"] = count



        arr.push(data);

      }
      return { arr: arr, counter: uid };

    } catch (e) {
      console.log("some error occured while verifiying email !")
    }
  }
}
async function Tomba_enrichment_api(item, uid) {
  if (item?.email?.email) {
    try {

      const url = `https://api.tomba.io/v1/enrich?email=${item.email.email}`;
      const headers = {
        'Content-Type': 'application/json',
        'X-Tomba-Key': process.env.TOMBA_API_KEY,
        'X-Tomba-Secret': process.env.TOMBA_API_SECRET
      };

      const res = await axios.get(url, { headers });
      const data = res?.data?.data;
      if (!data.email || data.email === null) {
        data.email = item.email.email
      }

      const parts = item.email.email.split('@');
      var  companySite = '';
      var companyName = '';
      var userName = '';

      if (parts.length === 2) {
         userName =  parts[0]!="jobs" && parts[0]!="accounts"   && parts[0]!="info"  && parts[0]!="care"  && parts[0]!="help"? parts[0] :'' ;
        const domain = parts[1];
        companySite =domain;
      
        // Check if the domain contains "www." to identify a potential website
        const domainParts = domain.split('.');
        companyName = domainParts[0] ? domainParts[0] :  null;
      
      }


      if (data.company ===undefined || data.company ===null) {
        data["company"] = companyName;
      }
       if  (data.full_name ===undefined || data.full_name ===null) {
        data["full_name"] = userName!='' ?userName :null;
      }
      if (data.website_url ===undefined || data.website_url ===null) {
        data["website_url"] = companySite;
      }

      if (data.phone_number === true) {

        const urlP = `https://api.tomba.io/v1/phone/${item.email.email}`;
        const headersP = {
          'Content-Type': 'application/json',
          'X-Tomba-Key': process.env.TOMBA_API_KEY,
          'X-Tomba-Secret': process.env.TOMBA_API_SECRET
        };

        const resP = await axios.get(urlP, { headers: headersP });
        const dataP = resP?.data?.data;


        data["phoneInfo"] = dataP;
      }


      let count = uid.toString().padStart(3, '0');
      data["uid"] = count

      return { arr: data, counter: uid };

    } catch (e) {
      console.log("some error occured while email enrichment  email !")
    }
  }
}


const placesSearchusingGooglePlaceApi = asyncHandler(async (req, res) => {
  let table_google_places_response = []
  let table_domain_search = []
  let table_email_verifier = []
  let table_enrichment = []
  let table_risky_leads = []
  let table_verfied_leads = []

  let { query, typeOfSearch, region, category } = req.body;


  const searchUID = await generateSearchUID();


  if (!query || !typeOfSearch) {
    res.status(200).json({ "success": false, "message": "provide all information" })
  }

  else if (typeOfSearch === "withWebsite") {
    const response = await axios.get(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${process.env.GOOGLE_PLACES_API_KEY2}`);
    const places = response.data.results;


    for (const place of places) {
      const { place_id } = place
      const detailsResponse = await axios.get(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&key=${process.env.GOOGLE_PLACES_API_KEY2}`);
      const details = detailsResponse.data.result;

      const result = {};
      result[place_id] = details;
      table_google_places_response.push(result);
    }

    for (const item of table_google_places_response) {


      const res = await TombaDomainSearch(item[Object.keys(item)[0]]);
      if (res) {
        if (table_domain_search.length >= 10) {
          break;
        } else {
          table_domain_search.push(res)
        }
      }
    }





    for (const item of table_domain_search) {

      const obj = await TombaEmailVerification(item[Object.keys(item)[0]], searchUID);
      if (obj) {

        let arrr = obj.arr;

        table_email_verifier.push(...arrr)
      }
    }



    for (const item of table_email_verifier) {

      const obj = await Tomba_enrichment_api(item, searchUID);
      if (obj) {
        table_enrichment.push(obj.arr)
      }
    }

    for (const item of table_email_verifier) {
      const res = item;

      if (res?.email && res?.email?.status && res?.email?.status === "valid") {

        const enrichedData = table_enrichment.find((data) =>
          data.email === res.email.email
        );

        if (enrichedData) {
          table_verfied_leads.push(enrichedData);
        }
      }
      if (res?.email && res?.email?.result && res?.email?.result === "risky") {

        const enrichedData = table_enrichment.find((data) =>
          data.email === res.email.email
        );

        if (enrichedData) {
          table_risky_leads.push(enrichedData);
        }

      }
    }


    for (const lead of table_enrichment) {
      const newLead = {
        TableName: 'foundleads', // Change this to your DynamoDB table name
        Item: {
          _id: uuid.v4(),
          createdAt: new Date().toISOString(),
          UserId: req.user._id,
          typeOfSearch,
          query:req.body.query,
          lead: lead
        },
      };

      await dynamodb.put(newLead).promise();
    }

    for (const lead of table_risky_leads) {
      const newLead = {
        TableName: 'riskyleads', // Change this to your DynamoDB table name
        Item: {
          _id: uuid.v4(),
          UserId: req.user._id,
          typeOfSearch,
            query:req.body.query,

          lead: lead,
          createdAt: new Date().toISOString()

        },
      };

      await dynamodb.put(newLead).promise();
    }

    // Update user's TotalLeadsFound
    await dynamodb.update({
      TableName: 'users', // Change this to your DynamoDB table name for users
      Key: { _id: req.user._id },
      UpdateExpression: 'SET TotalLeadsFound = TotalLeadsFound + :val',
      ExpressionAttributeValues: { ':val': Number(table_enrichment.length) },
    }).promise();


    return res.status(200).json({ success: true, message: table_enrichment });



  }
  else if (typeOfSearch === "withoutWebsite") {



    let result;
    const headers = {
      'Content-Type': 'application/json',
      'X-API-KEY': process.env.OUTSCRAPER_API_KEY,
    };
    const filters = [
      {
        key: "site",
        operator: "is blank"
      }
    ]
    const tags = []
    const queries = [`${query}`,`${region}`]
    let categories = []
    if (category) {
      categories.push(category)
    }

    const resp = await axios.post(`https://api.app.outscraper.com/tasks`, 
    {
       service_name: "google_maps_service_v2", 
    tags: tags, 
    queries: queries,
     categories: categories,
      language: "en", 
      limit: 20, 
      filters: filters }
      , { headers: headers })


    let Respdata = resp.data

    let taskDetails;
    while (true) {
      const headers = {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.OUTSCRAPER_API_KEY,
      };
      const resP2 = await axios.get(`https://api.app.outscraper.com/tasks/${Respdata.id}`, { headers: headers });


      taskDetails = resP2.data;

      if (taskDetails.status === 'SUCCESS') {
        result = resP2.data
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    if (taskDetails && taskDetails.status === "FAILURE") {
      return res.status(200).json({
        "success": false,
        "result": "Some Error Occured !",
      })
    } else {


      const response = await axios.get(result.results[0].file_url, { responseType: 'arraybuffer' });
      const data = new Uint8Array(response.data);
      const workbook = XLSX.read(data, { type: 'array' });

      const sheetName = workbook.SheetNames[0]; // Assuming you want to read the first sheet
      const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      for (let i = 0; i < sheetData.length; i++) {

        sheetData[i].uid = searchUID;
        sheetData[i].file_url = result.results[0].file_url
      }





      for (const lead of sheetData) {
        const newLead = {
          TableName: 'foundleads', // Change this to your DynamoDB table name
          Item: {
            _id: uuid.v4(),
            createdAt: new Date().toISOString(),
            UserId: req.user._id,
            query:`${req.body.query} ,${req.body.region}`,
            typeOfSearch,
            lead: lead
          },
        };

        await dynamodb.put(newLead).promise();
      }

      // Update user's TotalLeadsFound
      await dynamodb.update({
        TableName: 'users', // Change this to your DynamoDB table name for users
        Key: { _id: req.user._id },
        UpdateExpression: 'SET TotalLeadsFound = TotalLeadsFound + :val',
        ExpressionAttributeValues: { ':val': Number(sheetData.length) },
      }).promise();
      res.status(200).json({ "success": true, "message": sheetData })

    }

  }

});


const EmailVerifer = asyncHandler(async (req, res) => {
  const { email } = req.body;
  let result = [];

  if (email.length === 0) {
    return res.status(200).json({ success: false, message: "Provide Email" });
  } else {
    for (const item of email) {
      try {
        const url = `https://api.tomba.io/v1/email-verifier/${item}`;
        const headers = {
          'Content-Type': 'application/json',
          'X-Tomba-Key': process.env.TOMBA_API_KEY,
          'X-Tomba-Secret': process.env.TOMBA_API_SECRET,
        };

        const resP = await axios.get(url, { headers });
        const data = resP?.data?.data;

        result.push(data);
      } catch (e) {
        result.push({ "email": "invalid" });
      }
    }
    return res.status(200).json({ success: true, message: result });
  }
});

const foundLeadsOfUser = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Current page
  const pageSize = 7; // Number of items per page

  const countParams = {
    TableName: 'foundleads', // Change this to your DynamoDB table name
    IndexName: 'FoundLeadsHistoryIndex', // Assuming you create an index on user and typeOfSearch
    KeyConditionExpression: 'UserId = :userId AND typeOfSearch = :typeOfSearch',

    // FilterExpression: 'typeOfSearch = :typeOfSearch',
    ExpressionAttributeValues: {
      ':userId': req.user._id,
      ':typeOfSearch': req.query.typeOfSearch,
    },
    Select: 'COUNT', // Specify COUNT to get the total count
  };

  const countResult = await dynamodb.query(countParams).promise();
  const totalCount = countResult.Count;

  // Calculate the total number of pages
  const totalPages = Math.ceil(totalCount / pageSize);

  const queryParams = {
    TableName: 'foundleads', // Change this to your DynamoDB table name
    IndexName: 'FoundLeadsHistoryIndex', // Assuming you create an index on user and typeOfSearch
    KeyConditionExpression: 'UserId = :userId AND typeOfSearch = :typeOfSearch',
    // FilterExpression: '',
    ExpressionAttributeValues: {
      ':userId': req.user._id,
      ':typeOfSearch': req.query.typeOfSearch,
    },
    ScanIndexForward: req.query.type, // Sort in descending order of createdAt
    Limit: pageSize,
    ExclusiveStartKey: page > 1 ? req.body.lastEvaluatedKey : undefined,
  };
  const queryResult = await dynamodb.query(queryParams).promise();
  const items = queryResult.Items;

  // Return response
  res.json({
    items,
    totalPages: totalPages,
    currentPage: page,
    lastCreatedAt: queryResult.LastEvaluatedKey ? queryResult.LastEvaluatedKey : null,
  });

});

const riskyLeadsOfUser = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Current page
  const pageSize = 7; // Number of items per page


  const countParams = {
    TableName: 'riskyleads', // Change this to your DynamoDB table name
    IndexName: 'RiskyLeadsHistoryIndex', // Assuming you create an index on user and typeOfSearch
    KeyConditionExpression: 'UserId = :userId AND typeOfSearch = :typeOfSearch',
    ExpressionAttributeValues: {
      ':userId': req.user._id,
      ':typeOfSearch': req.query.typeOfSearch,
    },
    Select: 'COUNT', // Specify COUNT to get the total count
  };

  const countResult = await dynamodb.query(countParams).promise();
  const totalCount = countResult.Count;

  // Calculate the total number of pages
  const totalPages = Math.ceil(totalCount / pageSize);

  const queryParams = {
    TableName: 'riskyleads', // Change this to your DynamoDB table name
    IndexName: 'RiskyLeadsHistoryIndex', // Assuming you create an index on user and typeOfSearch
    KeyConditionExpression: 'UserId = :userId AND typeOfSearch = :typeOfSearch',
    ExpressionAttributeValues: {
      ':userId': req.user._id,
      ':typeOfSearch': req.query.typeOfSearch,

    },
    ScanIndexForward: req.query.type, // Sort in descending order of createdAt
    Limit: pageSize,
    ExclusiveStartKey: page > 1 ? req.body.lastEvaluatedKey : undefined,
  };
  const queryResult = await dynamodb.query(queryParams).promise();
  const items = queryResult.Items;

  res.json({
    items,
    totalPages: totalPages,
    currentPage: page,
    lastCreatedAt: queryResult.LastEvaluatedKey ? queryResult.LastEvaluatedKey : null,
  });

});




module.exports = {
  placesSearchusingGooglePlaceApi,
  EmailVerifer,
  riskyLeadsOfUser,
  foundLeadsOfUser
};
