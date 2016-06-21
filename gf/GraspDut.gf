concrete GraspDut of Grasp = GraspSyntaxDut
  ** open ParadigmsDut, SyntaxDut in {

lincat Start = Utt ;

lin
  StartUtt u = lin Utt u ;

  default_PN = mkPN "[naam]" ;
  default_N = mkN "[ding]" ;
  default_A = mkA "[adjectief]" ;
  default_V = lin GraspV (mkV3 "[werkwoord]") ;
  default_Adv = mkAdv "[bijwoord]" ;
  default_NP = mkNP (mkPN "[iets]") ;

}
