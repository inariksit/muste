concrete GraspLexDut of GraspLex = GraspCatDut, LexiconDut [
  N, A, 

    man_N, woman_N, girl_N, boy_N, person_N,
    hair_N, hand_N, foot_N, head_N,
    shirt_N, hat_N, shoe_N,
    animal_N, cat_N, dog_N, horse_N, cow_N, fish_N, bird_N,
    house_N, car_N, airplaine_N, boat_N, bike_N,
    table_N, book_N, chair_N, 
    fruit_N, apple_N,
    tree_N, forest_N, stone_N, 
    water_N, wine_N, beer_N, milk_N,

    big_A, small_A, long_A, short_A, thick_A, thin_A, heavy_A,
    black_A, blue_A, green_A, red_A, white_A, yellow_A

], StructuralDut [
  AdA, Adv, Conj, IP, Prep, VV, Subj, IAdv, Det, Quant, Pron,

    very_AdA, too_AdA, so_AdA,
    and_Conj, or_Conj,
    whoSg_IP,
    by8agent_Prep, in_Prep, possess_Prep, with_Prep,
    -- can_VV, must_VV, want_VV,
    although_Subj, because_Subj, when_Subj,
    when_IAdv, where_IAdv, why_IAdv,
    every_Det, this_Quant, that_Quant,

    -- youSg_Pron, youPl_Pron, 
    i_Pron, he_Pron, she_Pron, we_Pron, they_Pron

] ** open (L=LexiconDut), (P=ParadigmsDut), (R=ResDut) in {

lincat Adverb = Adv ;

lin

  mary_PN = P.mkPN "Mary" ;
  john_PN = P.mkPN "John" ;
  gothenburg_PN = P.mkPN "Gotenburg" ;
  sweden_PN = P.mkPN "Zweden" ;
  london_PN = P.mkPN "Londen" ;
  britain_PN = P.mkPN "Brittanië" ;
  berlin_PN = P.mkPN "Berlijn" ;
  germany_PN = P.mkPN "Duitsland" ;

  here_Adverb = here_Adv ;
  there_Adverb = there_Adv ;
  somewhere_Adverb = somewhere_Adv ;
  everywhere_Adverb = everywhere_Adv ;

  -- NOTE: This should be an Aux instead!
  copula = verbV1 (lin V R.zijn_V) ;

  fly_V = verbV1 L.fly_V ;
  run_V = verbV1 L.run_V ;
  sit_V = verbV1 L.sit_V ;
  sleep_V = verbV1 L.sleep_V ;
  swim_V = verbV1 L.swim_V ;
  walk_V = verbV1 L.walk_V ;

  break_V = verbV2 L.break_V2 ;
  buy_V = verbV2 L.buy_V2 ;
  drink_V = verbV2 L.drink_V2 ;
  eat_V = verbV2 L.eat_V2 ;
  hate_V = verbV2 L.hate_V2 ;
  hear_V = verbV2 L.hear_V2 ;
  hunt_V = verbV2 L.hunt_V2 ;
  like_V = verbV2 L.like_V2 ;
  listen_V = verbV2 L.listen_V2 ;
  see_V = verbV2 L.see_V2 ;
  throw_V = verbV2 L.throw_V2 ;
  watch_V = verbV2 L.watch_V2 ;

  wonder_VQ = {v = verbVQ L.wonder_VQ; vq = L.wonder_VQ} ;
  know_VQ = {v = verbVQ L.know_VQ; vq = L.know_VQ} ;

  hope_VS = {v = verbVS L.hope_VS; vs = L.hope_VS} ;
  know_VS = {v = verbVS L.know_VS; vs = L.know_VS} ;
  say_VS = {v = verbVS L.say_VS; vs = L.say_VS} ;

  want_VV = mkVV (P.mkV "willen" "wilde" "gewild") ;

oper 

  verbV1 : V -> GraspV ;
  verbV2 : V2 -> GraspV ;
  verbVQ : VQ -> GraspV ;
  verbVS : VS -> GraspV ;

  mkVV : V -> GraspVV ;

  verbV1 v = lin GraspV (P.mkV3 v) ;
  verbV2 v2 = 
    let v1 : V = lin V { s = v2.s ; aux = v2.aux ;
                         prefix = v2.prefix ;
                         particle = v2.particle ;
                         vtype = v2.vtype } ;
        v2prep : Prep = P.mkPrep v2.c2.p1
    in lin GraspV (P.mkV3 v1 v2prep) ;
  verbVQ v = lin GraspV (P.mkV3 (lin V v)) ;
  verbVS v = lin GraspV (P.mkV3 (lin V v)) ;

  mkVV v = lin GraspVV {v = verbV1 v; vv = P.mkVV v} ;

}


